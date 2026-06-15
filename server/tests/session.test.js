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

test("persistent sessions store only a token hash", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email: "session@example.test",
      password: "session-password-long-enough",
      name: "Session User",
    },
  });
  const cookieToken = response.headers["set-cookie"]
    .match(/oneflow_session=([^;]+)/)[1];
  const session = await app.prisma.session.findFirst();

  assert.ok(session.tokenHash);
  assert.notEqual(session.tokenHash, cookieToken);
  assert.equal(session.tokenHash.includes(cookieToken), false);
});

test("expired sessions are rejected", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email: "expired@example.test",
      password: "session-password-long-enough",
      name: "Expired User",
    },
  });
  const cookie = response.headers["set-cookie"].split(";")[0];
  await app.prisma.session.updateMany({
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  const me = await app.inject({
    method: "GET",
    url: "/api/auth/me",
    headers: { cookie },
  });
  assert.equal(me.statusCode, 401);
});

test("dev session is unavailable in production", async (t) => {
  const productionApp = await createTestApp({
    nodeEnv: "production",
    isTest: true,
    corsOrigin: ["https://oneflow.example"],
  });
  t.after(() => productionApp.close());
  const response = await productionApp.inject({
    method: "POST",
    url: "/api/dev/session",
    payload: { profileKey: "production" },
  });
  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error.code, "DEV_ONLY_DISABLED");
});

test("development session header takes precedence over a stale auth cookie", async () => {
  const devSession = await startSession(app, "explicit-dev-mode");
  const response = await app.inject({
    method: "GET",
    url: "/api/auth/me",
    headers: {
      ...devSession.headers,
      cookie: "oneflow_session=stale-cookie",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.user.id, devSession.body.data.user.id);
});
