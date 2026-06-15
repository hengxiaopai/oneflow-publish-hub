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

test("dev session creates a local user and returns auth context", async () => {
  const session = await startSession(app, "creator-a");
  assert.equal(session.response.statusCode, 201);
  assert.equal(session.body.data.user.displayName, "本地开发者");
  assert.equal(session.body.data.workspace.role, "owner");
  assert.equal(session.body.data.subscription.planId, "free");
  assert.ok(session.body.data.sessionToken);
  assert.equal("password" in session.body.data, false);

  const me = await app.inject({
    method: "GET",
    url: "/api/auth/me",
    headers: session.headers,
  });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().data.workspace.id, session.body.data.workspace.id);
});

test("workspace endpoints only expose workspaces for the active user", async () => {
  const first = await startSession(app, "creator-a");
  const second = await startSession(app, "creator-b");

  const list = await app.inject({
    method: "GET",
    url: "/api/workspaces",
    headers: first.headers,
  });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().data.length, 1);
  assert.equal(list.json().data[0].id, first.body.data.workspace.id);
  assert.notEqual(list.json().data[0].id, second.body.data.workspace.id);

  const current = await app.inject({
    method: "GET",
    url: "/api/workspaces/current",
    headers: first.headers,
  });
  assert.equal(current.statusCode, 200);
  assert.equal(current.json().data.id, first.body.data.workspace.id);
});

test("logout invalidates the local development session", async () => {
  const session = await startSession(app);
  const logout = await app.inject({
    method: "POST",
    url: "/api/auth/logout",
    headers: session.headers,
  });
  assert.equal(logout.statusCode, 204);

  const me = await app.inject({
    method: "GET",
    url: "/api/auth/me",
    headers: session.headers,
  });
  assert.equal(me.statusCode, 401);
  assert.equal(me.json().error.code, "UNAUTHENTICATED");
});

test("protected APIs reject requests without a development session", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/workspaces/current",
  });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, "UNAUTHENTICATED");
});
