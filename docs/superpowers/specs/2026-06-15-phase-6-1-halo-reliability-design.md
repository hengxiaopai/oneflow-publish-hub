# Phase 6.1 Halo Publisher Reliability Design

更新日期：2026-06-15

## 目标

在不接入新平台、不引入外部队列、不重写前端的前提下，把现有进程内 Halo
Publisher 加固为可真实验收、可解释重试、可避免重复草稿、可审计的发布链路。

## 架构

发布 API 仍同步触发进程内 Worker，但 Worker 不再直接承担全部可靠性职责：

1. `urlSafetyService` 在保存连接、测试连接和请求 Halo 前验证目标 URL。
2. `publishIdempotencyService` 根据 workspace、文章快照、平台版本快照、平台和发布模式
   生成稳定 SHA-256 key。
3. `taskLockService` 使用数据库条件更新实现带过期时间的租约锁。
4. `retryPolicyService` 将 Halo 错误转换为可重试性、最大次数和下次重试时间。
5. `slugService` 规范化 slug，并在 409 时生成一次稳定后缀重试。
6. `publishTaskEventService` 写入结构化事件，不记录 Token、Header 或 Cookie。
7. Halo Worker 只负责编排这些服务与 Publisher Adapter。

## 数据模型

`PublishTask` 新增：

- `idempotencyKey`：稳定 SHA-256 key，workspace 内唯一。
- `lockedAt`、`lockOwner`：进程内 Worker 的数据库租约。
- `maxRetries`、`nextRetryAt`：重试上限和计划时间。
- `lastErrorCode`、`lastErrorMessage`、`retryable`：可解释失败状态。

新增 `PublishTaskEvent`：

- `workspaceId`、`publishTaskId`
- `type`、`message`
- `metadata`：脱敏 JSON
- `safeRemoteStatus`
- `durationMs`
- `createdAt`

事件按创建时间展示为发布记录详情时间线。

## 幂等语义

同一 workspace、文章快照、渠道版本快照、platformId 和 publishMode 得到同一个 key。
创建批次时若找到相同 key 且任务已 `draft_created` 或 `published`，新批次复用远程结果，
不调用 Halo。若找到正在运行的任务，复用其状态；若失败，则保留新任务上下文并允许按
重试策略执行。

## URL 安全

默认拒绝 localhost、回环地址、未指定地址、链路本地地址、RFC1918 私网、metadata
主机和非 HTTP(S) scheme。生产环境只允许 HTTPS。开发环境只有显式设置
`ALLOW_PRIVATE_HALO_URLS=true` 才允许私有地址；scheme 与生产 HTTPS 规则仍然生效。
连接保存、连接测试和每次真实请求均重新检查，防止配置绕过。

## 重试与冲突

- 401/403、404、422：不可自动重试。
- 409：仅在创建草稿阶段生成后缀 slug 后重试一次。
- timeout、network、5xx：可重试，使用短指数退避时间写入 `nextRetryAt`。
- 手动重试同样受 `retryable`、`maxRetries` 与锁控制。

## Smoke Test

`server/scripts/halo-smoke-test.js` 仅在手动执行时读取
`HALO_TEST_BASE_URL`、`HALO_TEST_ENDPOINT`、`HALO_TEST_PAT` 和
`HALO_TEST_MODE`。变量缺失时以成功退出码跳过；输出测试标题、远程 Post Name 与安全
URL，不输出 PAT。默认只创建带时间戳的测试草稿。

## 前端

不改变页面结构。Halo 设置弹窗增加 URL 安全说明、字段级错误、测试 loading 和最后
测试时间。发布记录每个任务增加可靠性摘要和“查看时间线”弹窗；不可重试时按钮禁用并
显示原因。

## 验收

- 自动化覆盖 URL 安全、幂等、锁、重试策略、slug 冲突、事件脱敏和 smoke script。
- 真实 smoke test 不进入 CI，缺少环境变量时明确跳过。
- 1440px 与 820px 无横向溢出，浏览器控制台无 error/warning。
- PAT 不进入 API、日志、事件、截图、导出或 Git。
