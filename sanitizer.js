"use strict";

(function exposeSanitizer(globalScope) {
  const ALLOWED_TAGS = new Set([
    "h1",
    "h2",
    "h3",
    "p",
    "strong",
    "em",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "img",
    "br",
    "hr",
  ]);
  const VOID_TAGS = new Set(["img", "br", "hr"]);
  const BLOCKED_TAGS = ["script", "iframe", "object", "embed"];

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function isSafeUrl(value) {
    const normalized = String(value || "")
      .replace(/[\u0000-\u0020]+/g, "")
      .toLowerCase();
    return normalized && !normalized.startsWith("javascript:");
  }

  function parseAttributes(source) {
    const attributes = new Map();
    const pattern =
      /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match;
    while ((match = pattern.exec(source))) {
      const name = match[1].toLowerCase();
      if (name.startsWith("on")) continue;
      attributes.set(name, match[2] ?? match[3] ?? match[4] ?? "");
    }
    return attributes;
  }

  function serializeAttributes(tagName, attributes) {
    if (tagName === "img") {
      return ["src", "alt", "title"]
        .filter(
          (name) =>
            attributes.has(name) &&
            (name !== "src" || isSafeUrl(attributes.get(name)))
        )
        .map(
          (name) => ` ${name}="${escapeAttribute(attributes.get(name))}"`
        )
        .join("");
    }

    if (tagName !== "a") return "";
    const safeAttributes = new Map();
    ["href", "title", "target", "rel"].forEach((name) => {
      if (attributes.has(name)) safeAttributes.set(name, attributes.get(name));
    });
    if (safeAttributes.has("href") && !isSafeUrl(safeAttributes.get("href"))) {
      safeAttributes.delete("href");
    }
    const href = safeAttributes.get("href") || "";
    const target = safeAttributes.get("target") || "";
    if (/^https?:\/\//i.test(href) || target === "_blank") {
      const relTokens = new Set(
        String(safeAttributes.get("rel") || "")
          .split(/\s+/)
          .filter(Boolean)
      );
      relTokens.add("noopener");
      relTokens.add("noreferrer");
      safeAttributes.set("rel", [...relTokens].join(" "));
    }
    return ["href", "title", "target", "rel"]
      .filter((name) => safeAttributes.has(name))
      .map(
        (name) =>
          ` ${name}="${escapeAttribute(safeAttributes.get(name))}"`
      )
      .join("");
  }

  function sanitizeHtml(input) {
    let html = String(input || "");
    BLOCKED_TAGS.forEach((tagName) => {
      html = html.replace(
        new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}\\s*>`, "gi"),
        ""
      );
      html = html.replace(
        new RegExp(`<${tagName}\\b[^>]*(?:\\/\\s*>|>)`, "gi"),
        ""
      );
    });

    return html.replace(/<!--[\s\S]*?-->|<\/?[^>]+>/g, (token) => {
      if (token.startsWith("<!--")) return "";
      const closing = /^<\s*\//.test(token);
      const nameMatch = token.match(/^<\s*\/?\s*([a-zA-Z0-9]+)/);
      if (!nameMatch) return "";
      const tagName = nameMatch[1].toLowerCase();
      if (!ALLOWED_TAGS.has(tagName)) return "";
      if (closing) return VOID_TAGS.has(tagName) ? "" : `</${tagName}>`;

      const attributeSource = token
        .replace(/^<\s*[a-zA-Z0-9]+/, "")
        .replace(/\/?\s*>$/, "");
      const attributes = parseAttributes(attributeSource);
      return `<${tagName}${serializeAttributes(tagName, attributes)}>`;
    });
  }

  const api = { sanitizeHtml };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  globalScope.OneFlowSanitizer = api;
})(typeof window !== "undefined" ? window : globalThis);
