import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildPublishIdempotencyKey,
  stableStringify,
} from "../src/services/publishIdempotencyService.js";

test("publish idempotency keys are stable across object key order", () => {
  const first = buildPublishIdempotencyKey({
    workspaceId: "workspace-1",
    channelConfigId: "halo-1",
    platformId: "halo",
    publishMode: "draft",
    articleSnapshot: { title: "OneFlow", tags: ["Halo"], summary: "Draft" },
    channelVersionSnapshot: { slug: "oneflow", title: "OneFlow" },
  });
  const second = buildPublishIdempotencyKey({
    channelVersionSnapshot: { title: "OneFlow", slug: "oneflow" },
    publishMode: "draft",
    platformId: "halo",
    articleSnapshot: { summary: "Draft", tags: ["Halo"], title: "OneFlow" },
    channelConfigId: "halo-1",
    workspaceId: "workspace-1",
  });

  assert.equal(first, second);
  assert.match(first, /^publish_[a-f0-9]{48}$/);
});

test("publish idempotency keys change with channel or immutable content", () => {
  const base = {
    workspaceId: "workspace-1",
    channelConfigId: "halo-1",
    platformId: "halo",
    publishMode: "draft",
    articleSnapshot: { title: "OneFlow" },
    channelVersionSnapshot: { slug: "oneflow" },
  };

  assert.notEqual(
    buildPublishIdempotencyKey(base),
    buildPublishIdempotencyKey({
      ...base,
      channelConfigId: "halo-2",
    }),
  );
  assert.notEqual(
    buildPublishIdempotencyKey(base),
    buildPublishIdempotencyKey({
      ...base,
      articleSnapshot: { title: "OneFlow revised" },
    }),
  );
  assert.notEqual(
    buildPublishIdempotencyKey(base),
    buildPublishIdempotencyKey({
      ...base,
      publishMode: "publish",
    }),
  );
  assert.equal(
    stableStringify({ b: 2, a: [{ z: 1, y: 2 }] }),
    '{"a":[{"y":2,"z":1}],"b":2}',
  );
});
