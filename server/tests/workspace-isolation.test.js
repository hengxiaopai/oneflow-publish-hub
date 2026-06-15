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

test("a session loses access immediately when workspace membership is removed", async () => {
  const session = await startSession(app, "removed-member");
  await app.prisma.workspaceMember.deleteMany({
    where: {
      userId: session.body.data.user.id,
      workspaceId: session.body.data.workspace.id,
    },
  });
  const response = await app.inject({
    method: "GET",
    url: "/api/articles",
    headers: session.headers,
  });
  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error.code, "WORKSPACE_ACCESS_DENIED");
});

test("cross-workspace article, channel, batch, and task resources stay hidden", async () => {
  const owner = await startSession(app, "tenant-owner");
  const outsider = await startSession(app, "tenant-outsider");
  const article = await app.prisma.article.create({
    data: {
      workspaceId: owner.body.data.workspace.id,
      title: "Tenant secret",
    },
  });
  const channel = await app.prisma.channelConfig.create({
    data: {
      workspaceId: owner.body.data.workspace.id,
      platformId: "mock",
      displayName: "Private channel",
    },
  });

  const articleResponse = await app.inject({
    method: "GET",
    url: `/api/articles/${article.id}`,
    headers: outsider.headers,
  });
  const channelResponse = await app.inject({
    method: "PUT",
    url: `/api/channels/${channel.id}`,
    headers: outsider.headers,
    payload: { displayName: "Stolen" },
  });
  assert.equal(articleResponse.statusCode, 404);
  assert.equal(channelResponse.statusCode, 404);
});
