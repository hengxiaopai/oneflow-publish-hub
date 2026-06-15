import assert from "node:assert/strict";
import test from "node:test";
import { createTestApp } from "./helpers.js";

test("OpenAPI document describes every Phase 4 API group", async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());
  const response = await app.inject({
    method: "GET",
    url: "/api/openapi.json",
  });
  const document = response.json();

  assert.equal(response.statusCode, 200);
  assert.equal(document.openapi, "3.1.0");
  [
    "/api/dev/session",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/me",
    "/api/workspaces/current",
    "/api/articles",
    "/api/channels",
    "/api/publish-batches",
    "/api/usage",
    "/api/ai-capabilities",
  ].forEach((path) => assert.ok(document.paths[path], path));
});
