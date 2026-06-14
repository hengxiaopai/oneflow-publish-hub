const test = require("node:test");
const assert = require("node:assert/strict");

const { sanitizeHtml } = require("../sanitizer.js");

test("sanitizer removes dangerous elements and their contents", () => {
  const input =
    '<p>安全</p><script>alert(1)</script><iframe src="x">frame</iframe>' +
    '<object>object</object><embed src="x"><p>结束</p>';

  assert.equal(sanitizeHtml(input), "<p>安全</p><p>结束</p>");
});

test("sanitizer removes event attributes and javascript links", () => {
  const input =
    '<p onclick="steal()">正文</p><a href="javascript:alert(1)" onload="x()">链接</a>';

  assert.equal(sanitizeHtml(input), "<p>正文</p><a>链接</a>");
});

test("sanitizer only keeps allowed image and link attributes", () => {
  const input =
    '<img src="/cover.png" alt="封面" title="图" width="900" onerror="x()">' +
    '<a href="https://example.com/a" title="外链" target="_blank" class="x">阅读</a>';

  assert.equal(
    sanitizeHtml(input),
    '<img src="/cover.png" alt="封面" title="图">' +
      '<a href="https://example.com/a" title="外链" target="_blank" rel="noopener noreferrer">阅读</a>'
  );
});

test("sanitizer unwraps unsupported presentation tags but keeps text", () => {
  assert.equal(
    sanitizeHtml("<section><div><span>保留文字</span></div></section>"),
    "保留文字"
  );
});
