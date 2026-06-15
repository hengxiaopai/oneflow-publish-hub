import { createHash } from "node:crypto";

const VOLATILE_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "lastSyncAt",
  "sourceArticleUpdatedAt",
]);

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => !VOLATILE_KEYS.has(key))
        .sort()
        .map((key) => [key, normalize(value[key])]),
    );
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(normalize(value));
}

export function buildPublishIdempotencyKey({
  workspaceId,
  channelConfigId,
  platformId,
  publishMode,
  articleSnapshot,
  channelVersionSnapshot,
}) {
  const digest = createHash("sha256")
    .update(
      stableStringify({
        workspaceId,
        channelConfigId,
        platformId,
        publishMode,
        articleSnapshot,
        channelVersionSnapshot,
      }),
    )
    .digest("hex")
    .slice(0, 48);
  return `publish_${digest}`;
}
