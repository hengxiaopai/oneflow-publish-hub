# HTML Sanitization

更新日期：2026-06-14

## 边界

正文通过 `contenteditable` 编辑并持久化 HTML。`sanitizer.js` 在正文变更、
导入工作区、创建发布快照和恢复编辑器时执行最小白名单过滤。

允许标签：

`h1`、`h2`、`h3`、`p`、`strong`、`em`、`a`、`ul`、`ol`、`li`、
`blockquote`、`code`、`pre`、`img`、`br`、`hr`。

规则：

- 删除 `script`、`iframe`、`object`、`embed` 及其内容。
- 删除 `onclick`、`onerror`、`onload` 等所有 `on*` 事件属性。
- 删除 `javascript:` 链接或图片地址。
- `img` 只保留 `src`、`alt`、`title`。
- `a` 只保留 `href`、`title`、`target`、`rel`。
- 外链或 `_blank` 链接自动加入 `rel="noopener noreferrer"`。
- 其他展示标签被解包，文字内容保留。

## 限制

这是本地 MVP 的最小过滤器，不替代成熟服务端 sanitizer。接后端后应在服务端
再次使用经过安全审计的 HTML parser/白名单库，并对图片代理、URL scheme、
CSS、SVG、富文本粘贴和 Unicode 混淆做更严格处理。
