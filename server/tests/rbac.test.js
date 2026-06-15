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

async function setRole(session, role) {
  await app.prisma.workspaceMember.update({
    where: {
      workspaceId_userId: {
        workspaceId: session.body.data.workspace.id,
        userId: session.body.data.user.id,
      },
    },
    data: { role },
  });
}

test("viewer can read but cannot create articles or modify channels", async () => {
  const session = await startSession(app, "viewer");
  await setRole(session, "viewer");
  const list = await app.inject({
    method: "GET",
    url: "/api/articles",
    headers: session.headers,
  });
  const createArticle = await app.inject({
    method: "POST",
    url: "/api/articles",
    headers: session.headers,
    payload: { title: "Forbidden" },
  });
  const createChannel = await app.inject({
    method: "POST",
    url: "/api/channels",
    headers: session.headers,
    payload: { platformId: "mock", displayName: "Forbidden" },
  });
  assert.equal(list.statusCode, 200);
  assert.equal(createArticle.statusCode, 403);
  assert.equal(createArticle.json().error.code, "ROLE_PERMISSION_DENIED");
  assert.equal(createChannel.statusCode, 403);
});

test("editor can create and delete articles but cannot modify channels", async () => {
  const session = await startSession(app, "editor");
  await setRole(session, "editor");
  const createArticle = await app.inject({
    method: "POST",
    url: "/api/articles",
    headers: session.headers,
    payload: { title: "Editor article" },
  });
  const createChannel = await app.inject({
    method: "POST",
    url: "/api/channels",
    headers: session.headers,
    payload: { platformId: "mock", displayName: "Admin only" },
  });
  assert.equal(createArticle.statusCode, 201);
  const removed = await app.inject({
    method: "DELETE",
    url: `/api/articles/${createArticle.json().data.id}`,
    headers: session.headers,
  });
  assert.equal(removed.statusCode, 200);
  assert.equal(createChannel.statusCode, 403);
});

test("admin can manage channels", async () => {
  const session = await startSession(app, "admin");
  await setRole(session, "admin");
  const response = await app.inject({
    method: "POST",
    url: "/api/channels",
    headers: session.headers,
    payload: { platformId: "mock", displayName: "Admin channel" },
  });
  assert.equal(response.statusCode, 201);
});
