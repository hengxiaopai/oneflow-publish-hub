import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createTestApp, resetDatabase, startSession } from "./helpers.js";

let app;
let fetchMode = "success";

before(async () => {
  app = await createTestApp(
    {},
    {
      fetchImpl: async (_url, options) => {
        if (fetchMode === "failure") {
          return Response.json({ message: "Unauthorized" }, { status: 401 });
        }
        assert.equal(options.headers.authorization, "Bearer pat_halo_secret");
        return Response.json({ items: [], total: 0 });
      },
    },
  );
});

beforeEach(async () => {
  fetchMode = "success";
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

async function connect(session) {
  return app.inject({
    method: "POST",
    url: "/api/channels/halo/connect",
    headers: session.headers,
    payload: {
      displayName: "OneFlow Blog",
      baseUrl: "https://blog.example.test",
      consoleApiEndpoint: "/apis/api.console.halo.run/v1alpha1",
      credential: "pat_halo_secret",
      publishMode: "draft",
      defaultCategory: "engineering",
      defaultTags: ["oneflow", "halo"],
      defaultOwner: "admin",
      defaultCoverStrategy: "article_cover",
    },
  });
}

test("owner connects Halo with encrypted PAT and redacted API responses", async () => {
  const session = await startSession(app);
  const response = await connect(session);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.includes("pat_halo_secret"), false);
  assert.equal(response.body.includes("encryptedCredential"), false);
  assert.equal(response.json().data.publisherMode, "halo");
  assert.equal(response.json().data.credentialStatus, "stored");
  assert.equal(response.json().data.connectionStatus, "not_connected");

  const stored = await app.prisma.channelConfig.findUnique({
    where: { id: response.json().data.id },
  });
  assert.notEqual(stored.encryptedCredential, "pat_halo_secret");
  assert.equal(stored.encryptedCredential.includes("pat_halo_secret"), false);
});

test("editor and viewer cannot change Halo credentials", async () => {
  for (const role of ["editor", "viewer"]) {
    const session = await startSession(app, `halo-${role}`);
    await setRole(session, role);
    const response = await connect(session);
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "ROLE_PERMISSION_DENIED");
  }
});

test("Halo connection status, test failure, and credential clearing are explicit", async () => {
  const session = await startSession(app);
  await connect(session);

  const success = await app.inject({
    method: "POST",
    url: "/api/channels/halo/test",
    headers: session.headers,
  });
  assert.equal(success.statusCode, 200);
  assert.equal(success.json().data.lastTestStatus, "success");
  assert.equal(success.body.includes("pat_halo_secret"), false);

  fetchMode = "failure";
  const failed = await app.inject({
    method: "POST",
    url: "/api/channels/halo/test",
    headers: session.headers,
  });
  assert.equal(failed.statusCode, 401);
  assert.equal(failed.json().error.code, "HALO_AUTH_FAILED");

  const status = await app.inject({
    method: "GET",
    url: "/api/channels/halo/status",
    headers: session.headers,
  });
  assert.equal(status.statusCode, 200);
  assert.equal(status.json().data.lastTestStatus, "failed");

  const cleared = await app.inject({
    method: "POST",
    url: "/api/channels/halo/clear-credential",
    headers: session.headers,
  });
  assert.equal(cleared.statusCode, 200);
  assert.equal(cleared.json().data.credentialStatus, "none");
  assert.equal(cleared.json().data.connectionStatus, "not_connected");
});
