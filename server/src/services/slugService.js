import { createHash } from "node:crypto";

export function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{Letter}\p{Number}._~-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._~]+|[-._~]+$/g, "");
}

export function generateSlug(title, existingSlug = "") {
  return normalizeSlug(existingSlug) || normalizeSlug(title) || "oneflow-post";
}

export function appendSlugSuffix(slug, seed) {
  const suffix = createHash("sha256")
    .update(String(seed || slug))
    .digest("hex")
    .slice(0, 8);
  return `${normalizeSlug(slug) || "oneflow-post"}-${suffix}`;
}

export function resolveSlugConflict(slug, seed, conflictAttempt) {
  return conflictAttempt === 0 ? appendSlugSuffix(slug, seed) : null;
}
