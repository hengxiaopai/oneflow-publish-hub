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

async function createChannel(session, overrides = {}) {
  return app.inject({
    method: "POST",
    url: "/api/channels",
    headers: session.headers,
    payload: {
      platformId: "halo",
      displayName: "技术博客",
      channelType: "article",
      configuration: {
        baseUrl: "https://blog.example.test",
        publishMode: "create_draft",
      },
      credential: "local-development-token",
      mockBehavior: "success",
      ...overrides,
    },
  });
}

test("ChannelConfig encrypts credentials and API responses redact all secrets", async () => {
  const session = await startSession(app);
  const created = await createChannel(session);
  assert.equal(created.statusCode, 201);
  const bodyText = created.body;
  assert.equal(bodyText.includes("local-development-token"), false);
  assert.equal(bodyText.includes("encryptedCredential"), false);
  assert.equal(created.json().data.credentialStatus, "stored");

  const stored = await app.prisma.channelConfig.findUnique({
    where: { id: created.json().data.id },
  });
  assert.notEqual(stored.encryptedCredential, "local-development-token");
  assert.equal(stored.encryptedCredential.includes("local-development-token"), false);

  const list = await app.inject({
    method: "GET",
    url: "/api/channels",
    headers: session.headers,
  });
  assert.equal(list.body.includes("encryptedCredential"), false);
  assert.equal(list.body.includes("local-development-token"), false);
});

test("channel configuration can be updated and connection tested", async () => {
  const session = await startSession(app);
  const created = await createChannel(session);
  const channelId = created.json().data.id;

  const updated = await app.inject({
    method: "PUT",
    url: `/api/channels/${channelId}`,
    headers: session.headers,
    payload: {
      displayName: "产品博客",
      configuration: {
        baseUrl: "https://product.example.test",
        publishMode: "create_draft",
      },
    },
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().data.displayName, "产品博客");

  const checked = await app.inject({
    method: "POST",
    url: `/api/channels/${channelId}/test`,
    headers: session.headers,
  });
  assert.equal(checked.statusCode, 200);
  assert.equal(checked.json().data.connectionStatus, "connected");
  assert.ok(checked.json().data.lastVerifiedAt);
});

test("Free plan prevents connecting more than two channels", async () => {
  const session = await startSession(app);
  assert.equal((await createChannel(session)).statusCode, 201);
  assert.equal(
    (
      await createChannel(session, {
        platformId: "blog-2",
        displayName: "第二渠道",
      })
    ).statusCode,
    201,
  );

  const blocked = await createChannel(session, {
    platformId: "blog-3",
    displayName: "第三渠道",
  });
  assert.equal(blocked.statusCode, 403);
  assert.equal(blocked.json().error.code, "ENTITLEMENT_LIMIT_EXCEEDED");
  assert.equal(blocked.json().error.details.reason, "CHANNEL_LIMIT_REACHED");
});

test("channels remain isolated between workspaces", async () => {
  const first = await startSession(app, "workspace-a");
  const second = await startSession(app, "workspace-b");
  const created = await createChannel(first);

  const update = await app.inject({
    method: "PUT",
    url: `/api/channels/${created.json().data.id}`,
    headers: second.headers,
    payload: { displayName: "越权修改" },
  });
  assert.equal(update.statusCode, 404);

  const secondList = await app.inject({
    method: "GET",
    url: "/api/channels",
    headers: second.headers,
  });
  assert.deepEqual(secondList.json().data, []);
});
