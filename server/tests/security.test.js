import assert from "node:assert/strict";
import test from "node:test";
import { createTestApp } from "./helpers.js";

test("CORS allows configured origins and omits untrusted origins", async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());

  const allowed = await app.inject({
    method: "OPTIONS",
    url: "/api/auth/me",
    headers: {
      origin: "http://127.0.0.1:4173",
      "access-control-request-method": "GET",
    },
  });
  assert.equal(
    allowed.headers["access-control-allow-origin"],
    "http://127.0.0.1:4173",
  );

  const denied = await app.inject({
    method: "OPTIONS",
    url: "/api/auth/me",
    headers: {
      origin: "https://untrusted.example",
      "access-control-request-method": "GET",
    },
  });
  assert.equal(denied.headers["access-control-allow-origin"], undefined);
});

test("security headers are present on API responses", async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());
  const response = await app.inject({ method: "GET", url: "/api/health" });

  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "SAMEORIGIN");
});

test("dev session endpoint is rate limited", async (t) => {
  const app = await createTestApp({ devSessionRateLimitMax: 2 });
  t.after(() => app.close());

  const responses = [];
  for (let index = 0; index < 3; index += 1) {
    responses.push(
      await app.inject({
        method: "POST",
        url: "/api/dev/session",
        payload: { profileKey: `rate-${index}` },
      }),
    );
  }

  assert.equal(responses[2].statusCode, 429);
  assert.equal(responses[2].json().ok, false);
  assert.equal(responses[2].json().error.code, "RATE_LIMITED");
});

test("API mutations reject non-JSON request bodies", async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());
  const response = await app.inject({
    method: "POST",
    url: "/api/dev/session",
    headers: { "content-type": "text/plain" },
    payload: "profileKey=plain-text",
  });

  assert.equal(response.statusCode, 415);
  assert.equal(response.json().ok, false);
  assert.equal(response.json().error.code, "UNSUPPORTED_MEDIA_TYPE");
});
