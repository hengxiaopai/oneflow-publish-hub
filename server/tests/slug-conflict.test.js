import assert from "node:assert/strict";
import test from "node:test";

import {
  appendSlugSuffix,
  generateSlug,
  normalizeSlug,
  resolveSlugConflict,
} from "../src/services/slugService.js";

test("slug helpers normalize titles and preserve a valid existing slug", () => {
  assert.equal(normalizeSlug("  OneFlow Halo 发布  "), "oneflow-halo-发布");
  assert.equal(generateSlug("OneFlow Halo Publisher"), "oneflow-halo-publisher");
  assert.equal(
    generateSlug("Ignored", "existing-slug"),
    "existing-slug",
  );
});

test("slug conflict suffix is stable and only applied once", () => {
  const first = appendSlugSuffix("oneflow-halo", "stable-task-key");
  const second = appendSlugSuffix("oneflow-halo", "stable-task-key");
  assert.equal(first, second);
  assert.match(first, /^oneflow-halo-[a-f0-9]{8}$/);
  assert.equal(
    resolveSlugConflict("oneflow-halo", "stable-task-key", 0),
    first,
  );
  assert.equal(
    resolveSlugConflict("oneflow-halo", "stable-task-key", 1),
    null,
  );
});
