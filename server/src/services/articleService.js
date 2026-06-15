import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { sanitizeHtml } = require("../../../sanitizer.js");

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function articleView(article) {
  return {
    ...article,
    tags: parseJson(article.tags, []),
    cover: parseJson(article.cover, {}),
  };
}

export function articleData(input, current = {}) {
  const next = {};
  if ("title" in input) next.title = String(input.title).trim();
  if ("slug" in input) next.slug = String(input.slug || "").trim();
  if ("summary" in input) next.summary = String(input.summary || "");
  if ("contentHtml" in input) {
    next.contentHtml = sanitizeHtml(String(input.contentHtml || ""));
  }
  if ("contentMarkdown" in input) {
    next.contentMarkdown = String(input.contentMarkdown || "");
  }
  if ("tags" in input) next.tags = JSON.stringify(input.tags || []);
  if ("cover" in input) next.cover = JSON.stringify(input.cover || {});
  if ("status" in input) next.status = input.status || current.status || "draft";
  return next;
}
