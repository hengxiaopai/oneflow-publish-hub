import assert from "node:assert/strict";
import test from "node:test";

import { runHaloSmokeTest } from "../scripts/halo-smoke-test.js";

test("Halo smoke test skips safely when environment variables are missing", async () => {
  const lines = [];
  const result = await runHaloSmokeTest({
    env: {},
    log: (line) => lines.push(line),
  });

  assert.equal(result.skipped, true);
  assert.match(lines.join("\n"), /HALO_TEST_BASE_URL/);
});

test("Halo smoke test creates a timestamped draft without logging PAT", async () => {
  const lines = [];
  const requests = [];
  const result = await runHaloSmokeTest({
    env: {
      HALO_TEST_BASE_URL: "https://blog.example.test",
      HALO_TEST_ENDPOINT: "/apis/api.console.halo.run/v1alpha1",
      HALO_TEST_PAT: "pat_smoke_secret",
      HALO_TEST_MODE: "draft",
    },
    now: () => new Date("2026-06-15T12:34:56.000Z"),
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return Response.json({
        metadata: { name: "post-smoke" },
        status: { phase: "DRAFT", permalink: "/archives/post-smoke" },
      });
    },
    log: (line) => lines.push(line),
    assertSafeUrl: async () => new URL("https://blog.example.test"),
  });

  const requestBody = JSON.parse(requests[0].options.body);
  assert.match(requestBody.post.spec.title, /OneFlow Smoke Test/);
  assert.match(requestBody.post.spec.title, /2026-06-15T12:34:56/);
  assert.equal(result.remotePostName, "post-smoke");
  assert.equal(lines.join("\n").includes("pat_smoke_secret"), false);
  assert.equal(JSON.stringify(result).includes("pat_smoke_secret"), false);
});
