# Storage Migration

更新日期：2026-06-14

## 当前版本

- 当前 key：`oneflow.workspace.v3`
- 兼容读取：`oneflow.workspace.v2`、`oneflow.workspace.v1`
- envelope 字段：`schemaVersion`、`savedAt`、`state`

## 迁移流程

1. 优先读取 v3；不存在时按 v2、v1 顺序查找。
2. JSON 解析失败时返回 `reason: corrupt`，保留 `raw`，不写入默认数据。
3. 高于 v3 的版本返回 `unsupported_version`，不降级覆盖。
4. v1/v2 的 `article` 迁移为 `currentArticle`，旧封面字段迁移为 `cover`。
5. 旧发布批次补建 ArticleSnapshot；能找到平台版本时补建
   ChannelVersionSnapshot 引用。
6. 迁移成功后由应用保存为 v3，并移除旧 key。

## 导入导出

`exportWorkspaceData(state)` 返回文件名、JSON 和 payload。
`importWorkspaceData(input)` 先解析再调用同一迁移链。应用层在确认覆盖前执行
正文过滤，并展示导入文章标题和发布批次数。

损坏数据提示为：“本地数据异常，可导出备份或重置演示数据”。原始内容可以
下载为文本备份，避免静默丢失。
