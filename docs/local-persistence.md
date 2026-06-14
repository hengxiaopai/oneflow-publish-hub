# Local Persistence

更新日期：2026-06-14

## 存储方案

Phase 2.5 使用 `localStorage`，存储键为 `oneflow.workspace.v3`。`storage.js`
提供独立仓库接口，页面不直接散落调用 `localStorage`。

```json
{
  "schemaVersion": 3,
  "savedAt": "2026-06-13T16:00:00.000Z",
  "state": {
    "currentArticle": {},
    "channels": [],
    "channelVersions": [],
    "platformCapabilities": [],
    "publishTasks": [],
    "publishBatches": [],
    "articleSnapshots": [],
    "channelVersionSnapshots": [],
    "validationIssues": [],
    "workspaceSettings": {}
  }
}
```

## 保存流程

1. 页面先创建当前版本的演示数据。
2. 读取 v3 快照；若仅存在 v1/v2，则先迁移到 v3 内存结构。
3. `mergePersistedState()` 用当前默认字段补齐迁移后的快照。
4. 编辑文章时立即更新内存状态，并在 500ms 后写入本地。
5. 渠道选择、授权、重试、确认、密度切换和批次操作立即写入。
6. 页面离开前再执行一次同步保存。

保存状态显示为：

- `保存中`
- `已保存 HH:mm`
- `保存失败`

## 重置

侧栏“重置演示数据”会删除 v1/v2/v3 快照、恢复演示数据，并重新保存。发布历史、
文章编辑和队列状态都会一起重置。

## 限制

- `localStorage` 容量有限，不适合保存图片、视频和大型版本历史。
- 数据只存在当前浏览器和当前来源下，不会跨设备同步。
- 浏览器清理站点数据后无法恢复。
- 当前没有加密，不保存访问令牌、Cookie 或平台密钥。
- 多标签页同时编辑时采用最后写入覆盖。
- 导入会先解析、迁移和过滤正文，再弹窗确认；不会无提示覆盖。
- 数据损坏或版本过新时不自动保存默认数据，避免覆盖可恢复的原始内容。

## 导入导出

`exportWorkspaceData()` 导出 schema v3 JSON，文件名为
`oneflow-workspace-YYYYMMDD-HHmm.json`。`importWorkspaceData()` 支持 v1/v2/v3，
拒绝未来版本和损坏 JSON。导出数据不包含 Token、Cookie、密码或图片二进制。

## 后端迁移

后续可保持 UI 状态模型不变，将仓库替换为：

- Article 与 ChannelVersion REST/GraphQL API。
- PublishTask 与 PublishBatch 服务端事务接口。
- PlatformCapability 由产品配置服务下发。
- ValidationIssue 由发布前校验服务生成。
- WorkspaceSettings 使用用户偏好接口。
- 封面和视频素材进入对象存储，状态中只保留资源 ID。
