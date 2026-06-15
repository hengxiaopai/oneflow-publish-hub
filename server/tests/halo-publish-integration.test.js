import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createTestApp, resetDatabase, startSession } from "./helpers.js";

let app;
let draftAttempts = 0;
let failFirstDraft = false;

before(async () => {
  app = await createTestApp(
    {},
    {
      fetchImpl: async (url, options) => {
        if (options.method === "POST") {
          draftAttempts += 1;
          if (failFirstDraft && draftAttempts === 1) {
            return Response.json({ message: "Service unavailable" }, { status: 503 });
          }
          return Response.json({
            metadata: { name: "post-oneflow" },
            spec: { slug: "oneflow-halo" },
            status: {
              phase: "DRAFT",
              permalink: "/archives/oneflow-halo",
            },
          });
        }
        if (options.method === "PUT") {
          return Response.json({
            metadata: { name: "post-oneflow" },
            spec: { slug: "oneflow-halo" },
            status: {
              phase: "PUBLISHED",
              permalink: "/archives/oneflow-halo",
            },
          });
        }
        return Response.json({ items: [], total: 0 });
      },
    },
  );
});

beforeEach(async () => {
  draftAttempts = 0;
  failFirstDraft = false;
  await resetDatabase(app);
});

after(async () => {
  await app.close();
});

async function setup(session, publishMode = "draft") {
  const articleResponse = await app.inject({
    method: "POST",
    url: "/api/articles",
    headers: session.headers,
    payload: {
      title: "OneFlow Halo",
      summary: "Server-side publishing",
      contentHtml: "<h2>Safe worker</h2><p>No browser token.</p>",
      contentMarkdown: "## Safe worker\n\nNo browser token.",
      tags: ["Halo"],
      cover: { url: "https://cdn.example.test/cover.png" },
    },
  });
  const channelResponse = await app.inject({
    method: "POST",
    url: "/api/channels/halo/connect",
    headers: session.headers,
    payload: {
      displayName: "OneFlow Blog",
      baseUrl: "https://blog.example.test",
      consoleApiEndpoint: "/apis/api.console.halo.run/v1alpha1",
      credential: "pat_halo_secret",
      publishMode,
      defaultTags: ["oneflow"],
    },
  });
  return {
    article: articleResponse.json().data,
    channel: channelResponse.json().data,
  };
}

test("Halo worker writes draft remote information into publish history", async () => {
  const session = await startSession(app);
  const { article, channel } = await setup(session);
  const response = await app.inject({
    method: "POST",
    url: "/api/publish-batches",
    headers: session.headers,
    payload: { articleId: article.id, channelIds: [channel.id] },
  });
  assert.equal(response.statusCode, 202);
  const task = response.json().data.tasks[0];
  assert.equal(task.status, "draft_created");
  assert.equal(task.remotePostName, "post-oneflow");
  assert.equal(task.remoteStatus, "DRAFT");
  assert.match(task.remoteEditUrl, /console\/posts\/editor\?name=post-oneflow$/);
  assert.match(task.remotePreviewUrl, /archives\/oneflow-halo$/);
  assert.ok(task.draftCreatedAt);
  assert.ok(task.lastSyncAt);
  assert.equal(JSON.stringify(task).includes("pat_halo_secret"), false);
});

test("Halo publish mode creates the draft before publishing", async () => {
  const session = await startSession(app);
  const { article, channel } = await setup(session, "publish");
  const response = await app.inject({
    method: "POST",
    url: "/api/publish-batches",
    headers: session.headers,
    payload: { articleId: article.id, channelIds: [channel.id] },
  });
  const task = response.json().data.tasks[0];
  assert.equal(task.status, "published");
  assert.equal(task.remoteStatus, "PUBLISHED");
  assert.match(task.remotePublicUrl, /archives\/oneflow-halo$/);
  assert.ok(task.publishedAt);
  assert.equal(draftAttempts, 1);
});

test("failed Halo task retries with the same immutable context", async () => {
  failFirstDraft = true;
  const session = await startSession(app);
  const { article, channel } = await setup(session);
  const response = await app.inject({
    method: "POST",
    url: "/api/publish-batches",
    headers: session.headers,
    payload: { articleId: article.id, channelIds: [channel.id] },
  });
  const failed = response.json().data.tasks[0];
  assert.equal(failed.status, "failed");
  assert.equal(failed.channelVersionSnapshot.title, article.title);

  const retry = await app.inject({
    method: "POST",
    url: `/api/publish-tasks/${failed.id}/retry`,
    headers: session.headers,
  });
  assert.equal(retry.statusCode, 202);
  assert.equal(retry.json().data.status, "draft_created");
  assert.equal(retry.json().data.retryCount, 1);
  assert.equal(retry.json().data.channelVersionSnapshot.title, article.title);
});

test("stale Halo versions are blocked and create ValidationIssue records", async () => {
  const session = await startSession(app);
  const workspaceId = session.body.data.workspace.id;
  const { article, channel } = await setup(session);
  await app.prisma.channelVersion.create({
    data: {
      workspaceId,
      articleId: article.id,
      channelConfigId: channel.id,
      title: article.title,
      summary: article.summary,
      contentHtml: article.contentHtml,
      contentMarkdown: article.contentMarkdown,
      tags: JSON.stringify(article.tags),
      status: "stale",
    },
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/publish-batches",
    headers: session.headers,
    payload: { articleId: article.id, channelIds: [channel.id] },
  });
  const task = response.json().data.tasks[0];
  assert.equal(task.status, "failed");
  assert.match(task.errorMessage, /重新适配|stale/i);
  assert.equal(draftAttempts, 0);
  const issues = await app.prisma.validationIssue.findMany({
    where: { workspaceId, publishTaskId: task.id },
  });
  assert.equal(issues.some((issue) => issue.code === "CHANNEL_VERSION_STALE"), true);
});
