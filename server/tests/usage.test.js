import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import {
  createTestApp,
  resetDatabase,
  startSession,
} from "./helpers.js";

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

test("usage returns the authenticated workspace plan and quotas", async () => {
  const session = await startSession(app, "usage-owner");

  const response = await app.inject({
    method: "GET",
    url: "/api/usage",
    headers: session.headers,
  });

  assert.equal(response.statusCode, 200);
  const usage = response.json().data;
  assert.equal(usage.planId, "free");
  assert.equal(usage.articles.used, 0);
  assert.equal(usage.articles.limit, 20);
  assert.equal(usage.members.used, 1);
  assert.equal(usage.capabilities.scheduledPublishing, false);
});
