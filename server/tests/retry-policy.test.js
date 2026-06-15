import assert from "node:assert/strict";
import test from "node:test";

import { getRetryDecision } from "../src/services/retryPolicyService.js";

test("authentication, endpoint, and payload failures are not retryable", () => {
  for (const code of [
    "HALO_AUTH_FAILED",
    "HALO_CREDENTIAL_INVALID",
    "HALO_ENDPOINT_NOT_FOUND",
    "HALO_PAYLOAD_INVALID",
    "UNSAFE_REMOTE_URL",
  ]) {
    const decision = getRetryDecision({ code }, { retryCount: 0, maxRetries: 3 });
    assert.equal(decision.retryable, false, code);
    assert.equal(decision.nextRetryAt, null, code);
  }
});

test("network, timeout, and upstream failures schedule an explainable retry", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");
  for (const code of [
    "HALO_TIMEOUT",
    "HALO_NETWORK_ERROR",
    "HALO_UNREACHABLE",
    "HALO_UPSTREAM_ERROR",
  ]) {
    const decision = getRetryDecision(
      { code },
      { retryCount: 1, maxRetries: 3, now },
    );
    assert.equal(decision.retryable, true, code);
    assert.ok(decision.nextRetryAt > now, code);
  }
});

test("slug conflict is handled once and exhausted retries fail closed", () => {
  assert.equal(
    getRetryDecision(
      { code: "HALO_SLUG_CONFLICT" },
      { retryCount: 0, maxRetries: 3 },
    ).strategy,
    "resolve_slug_once",
  );
  assert.equal(
    getRetryDecision(
      { code: "HALO_TIMEOUT" },
      { retryCount: 3, maxRetries: 3 },
    ).retryable,
    false,
  );
});
