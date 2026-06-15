import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createTestApp, resetDatabase, startSession } from "./helpers.js";

let app;

before(async () => {
  app = await createTestApp();
});

beforeEach(async () => {
  await resetDatabase(app);
});

after(async () => {
  await app.close();
});

async function createArticle(session, title = "发布测试文章") {
  const response = await app.inject({
    method: "POST",
    url: "/api/articles",
    headers: session.headers,
    payload: {
      title,
      summary: "测试摘要",
      contentHtml: "<p>测试正文</p>",
      contentMarkdown: "测试正文",
      tags: ["测试"],
    },
  });
  return response.json().data;
}

async function createChannel(session, mockBehavior = "success") {
  const response = await app.inject({
    method: "POST",
    url: "/api/channels",
    headers: session.headers,
    payload: {
      platformId: `mock-${mockBehavior}`,
      displayName: `Mock ${mockBehavior}`,
      configuration: { publishMode: "create_draft" },
      credential: "local-mock-credential",
      mockBehavior,
    },
  });
  return response.json().data;
}

test("creating a batch stores immutable snapshots and Mock Worker result", async () => {
  const session = await startSession(app);
  const article = await createArticle(session, "快照标题");
  const channel = await createChannel(session);

  const created = await app.inject({
    method: "POST",
    url: "/api/publish-batches",
    headers: session.headers,
    payload: {
      articleId: article.id,
      channelIds: [channel.id],
      strategy: "automatic_first",
      postActions: ["write_back"],
    },
  });
  assert.equal(created.statusCode, 202);
  const batch = created.json().data;
  assert.equal(batch.articleSnapshot.title, "快照标题");
  assert.equal(batch.tasks.length, 1);
  assert.equal(batch.tasks[0].status, "draft_created");
  assert.match(batch.tasks[0].remoteUrl, /^https:\/\/mock\.oneflow\.local\//);
  assert.equal(batch.tasks[0].channelVersionSnapshot.title, "快照标题");

  await app.inject({
    method: "PUT",
    url: `/api/articles/${article.id}`,
    headers: session.headers,
    payload: { title: "编辑后的标题" },
  });

  const history = await app.inject({
    method: "GET",
    url: `/api/publish-batches/${batch.id}`,
    headers: session.headers,
  });
  assert.equal(history.json().data.articleSnapshot.title, "快照标题");
});

test("fail-once Mock task can retry without losing task context", async () => {
  const session = await startSession(app);
  const article = await createArticle(session);
  const channel = await createChannel(session, "fail_once");
  const created = await app.inject({
    method: "POST",
    url: "/api/publish-batches",
    headers: session.headers,
    payload: {
      articleId: article.id,
      channelIds: [channel.id],
    },
  });
  const failedTask = created.json().data.tasks[0];
  assert.equal(failedTask.status, "failed");
  assert.equal(failedTask.retryCount, 0);
  assert.equal(failedTask.channelVersionSnapshot.title, article.title);

  const retried = await app.inject({
    method: "POST",
    url: `/api/publish-tasks/${failedTask.id}/retry`,
    headers: session.headers,
  });
  assert.equal(retried.statusCode, 202);
  assert.equal(retried.json().data.status, "draft_created");
  assert.equal(retried.json().data.retryCount, 1);
  assert.match(retried.json().data.remoteUrl, /^https:\/\/mock\.oneflow\.local\//);
  assert.equal(
    retried.json().data.channelVersionSnapshot.title,
    article.title,
  );
});

test("publish history and task retries are workspace isolated", async () => {
  const first = await startSession(app, "workspace-a");
  const second = await startSession(app, "workspace-b");
  const article = await createArticle(first);
  const channel = await createChannel(first);
  const created = await app.inject({
    method: "POST",
    url: "/api/publish-batches",
    headers: first.headers,
    payload: { articleId: article.id, channelIds: [channel.id] },
  });
  const batch = created.json().data;

  const hiddenBatch = await app.inject({
    method: "GET",
    url: `/api/publish-batches/${batch.id}`,
    headers: second.headers,
  });
  assert.equal(hiddenBatch.statusCode, 404);

  const hiddenRetry = await app.inject({
    method: "POST",
    url: `/api/publish-tasks/${batch.tasks[0].id}/retry`,
    headers: second.headers,
  });
  assert.equal(hiddenRetry.statusCode, 404);
});

test("Free plan blocks publish batches after the monthly quota", async () => {
  const session = await startSession(app);
  const workspaceId = session.body.data.workspace.id;
  const article = await createArticle(session);
  const channel = await createChannel(session);
  await app.prisma.publishBatch.createMany({
    data: Array.from({ length: 10 }, (_, index) => ({
      workspaceId,
      articleId: article.id,
      articleSnapshot: JSON.stringify({ title: `Snapshot ${index}` }),
      status: "completed",
    })),
  });

  const blocked = await app.inject({
    method: "POST",
    url: "/api/publish-batches",
    headers: session.headers,
    payload: { articleId: article.id, channelIds: [channel.id] },
  });
  assert.equal(blocked.statusCode, 403);
  assert.equal(blocked.json().error.code, "ENTITLEMENT_LIMIT_EXCEEDED");
  assert.equal(
    blocked.json().error.details.reason,
    "PUBLISH_BATCH_LIMIT_REACHED",
  );
});
