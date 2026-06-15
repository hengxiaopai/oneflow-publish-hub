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

test("successful API responses use the shared envelope and request metadata", async () => {
  const session = await startSession(app);
  const response = await app.inject({
    method: "GET",
    url: "/api/auth/me",
    headers: session.headers,
  });
  const body = response.json();

  assert.equal(body.ok, true);
  assert.equal(body.data.workspace.id, session.body.data.workspace.id);
  assert.equal(typeof body.meta.requestId, "string");
});

test("validation and authentication errors use the shared envelope", async () => {
  const invalid = await app.inject({
    method: "POST",
    url: "/api/dev/session",
    payload: { profileKey: "" },
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().ok, false);
  assert.equal(invalid.json().error.code, "VALIDATION_ERROR");
  assert.equal(typeof invalid.json().error.details.requestId, "string");

  const unauthenticated = await app.inject({
    method: "GET",
    url: "/api/articles",
  });
  assert.equal(unauthenticated.statusCode, 401);
  assert.equal(unauthenticated.json().ok, false);
  assert.equal(unauthenticated.json().error.code, "UNAUTHENTICATED");
});

test("unknown routes return the shared 404 response", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/not-a-real-route",
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(
    {
      ok: response.json().ok,
      code: response.json().error.code,
    },
    { ok: false, code: "NOT_FOUND" },
  );
});
