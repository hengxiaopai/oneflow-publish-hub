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

test("Article API supports workspace-scoped CRUD and structured fields", async () => {
  const session = await startSession(app);
  const created = await app.inject({
    method: "POST",
    url: "/api/articles",
    headers: session.headers,
    payload: {
      title: "后端文章",
      summary: "进入 SaaS Dev Mode 的第一篇文章",
      contentHtml: "<h2>正文</h2><p>内容</p>",
      contentMarkdown: "## 正文\n\n内容",
      tags: ["SaaS", "OneFlow"],
      cover: { url: "/assets/article-cover.png", alt: "发布中枢" },
      status: "draft",
    },
  });
  assert.equal(created.statusCode, 201);
  const article = created.json().data;
  assert.deepEqual(article.tags, ["SaaS", "OneFlow"]);
  assert.equal(article.cover.alt, "发布中枢");

  const list = await app.inject({
    method: "GET",
    url: "/api/articles",
    headers: session.headers,
  });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().data.length, 1);

  const updated = await app.inject({
    method: "PUT",
    url: `/api/articles/${article.id}`,
    headers: session.headers,
    payload: {
      title: "后端文章已更新",
      tags: ["SaaS"],
    },
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().data.title, "后端文章已更新");
  assert.deepEqual(updated.json().data.tags, ["SaaS"]);

  const detail = await app.inject({
    method: "GET",
    url: `/api/articles/${article.id}`,
    headers: session.headers,
  });
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.json().data.contentMarkdown, "## 正文\n\n内容");

  const removed = await app.inject({
    method: "DELETE",
    url: `/api/articles/${article.id}`,
    headers: session.headers,
  });
  assert.equal(removed.statusCode, 200);
  assert.equal(removed.json().ok, true);
  assert.equal(removed.json().data, null);
});

test("Article lookup does not reveal another workspace resource", async () => {
  const first = await startSession(app, "workspace-a");
  const second = await startSession(app, "workspace-b");
  const created = await app.inject({
    method: "POST",
    url: "/api/articles",
    headers: first.headers,
    payload: { title: "A 工作区文章" },
  });
  const articleId = created.json().data.id;

  const hidden = await app.inject({
    method: "GET",
    url: `/api/articles/${articleId}`,
    headers: second.headers,
  });
  assert.equal(hidden.statusCode, 404);
  assert.equal(hidden.json().error.code, "NOT_FOUND");

  const list = await app.inject({
    method: "GET",
    url: "/api/articles",
    headers: second.headers,
  });
  assert.deepEqual(list.json().data, []);
});

test("Free plan blocks article creation after the server-side limit", async () => {
  const session = await startSession(app);
  const workspaceId = session.body.data.workspace.id;
  await app.prisma.article.createMany({
    data: Array.from({ length: 20 }, (_, index) => ({
      workspaceId,
      title: `Article ${index + 1}`,
    })),
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/articles",
    headers: session.headers,
    payload: { title: "超额文章" },
  });
  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error.code, "ENTITLEMENT_LIMIT_EXCEEDED");
  assert.equal(response.json().error.details.reason, "ARTICLE_LIMIT_REACHED");
});
