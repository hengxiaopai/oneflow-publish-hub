# Workspace Multitenancy

更新日期：2026-06-15

## 租户上下文

Session 固定关联 `userId` 与 `workspaceId`。每次受保护请求都会重新检查对应
`WorkspaceMember`，不会信任浏览器提交的 Workspace、Role 或 Plan。

成员被移除后，已有 Session 会在下一次请求立即得到
`WORKSPACE_ACCESS_DENIED`。

## 数据隔离

以下模型均以 `workspaceId` 过滤：

- Article、ChannelConfig、ChannelVersion
- PublishBatch、PublishTask
- AICapability、UsageRecord
- Subscription 与 WorkspaceMember

读取单条资源使用 `id + workspaceId` 查询。跨租户资源返回 404，避免泄露资源是否
存在；失去成员资格则在认证中间件阶段返回 403。创建资源时由服务端写入当前
Session 的 `workspaceId`。

## Workspace 所有权

- `Workspace.ownerId` 记录所有者。
- `WorkspaceMember.role=owner` 是运行时权限来源。
- `Workspace.plan` 是服务端 Entitlement 的额度来源。
- `Subscription` 保留计费周期与状态，不作为权限绕过入口。

## 后续工作

Phase 5 暂未提供 UI 工作区切换和成员邀请 API。未来切换 Workspace 时应创建或更新
服务端 Session 上下文，并再次验证 Membership，不能只修改前端状态。
