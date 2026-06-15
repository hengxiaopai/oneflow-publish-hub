# Backend API Design

更新日期：2026-06-15

## Phase 4 实现状态

当前 Fastify 服务已实现：

```text
POST /api/dev/session
GET  /api/auth/me
POST /api/auth/logout
GET  /api/workspaces
GET  /api/workspaces/current
GET  /api/articles
POST /api/articles
GET  /api/articles/:id
PUT  /api/articles/:id
DELETE /api/articles/:id
GET  /api/channels
POST /api/channels
PUT  /api/channels/:id
POST /api/channels/:id/test
POST /api/publish-batches
GET  /api/publish-batches
GET  /api/publish-batches/:id
POST /api/publish-tasks/:id/retry
GET  /api/usage
```

Phase 4 使用 `x-oneflow-dev-session` header 承载内存 dev session。下文的正式登录、
Secure HttpOnly Cookie、分页、幂等键和更细 Role 是生产目标，不应误解为已实现。

## 通用约定

Base path：`/api`

成功响应：

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "requestId": "req_01"
  }
}
```

错误响应：

```json
{
  "ok": false,
  "error": {
    "code": "PLAN_UPGRADE_REQUIRED",
    "message": "当前套餐不支持定时发布。",
    "details": {
      "requiredPlan": "pro",
      "requestId": "req_01"
    }
  }
}
```

通用错误码：

```text
UNAUTHENTICATED
FORBIDDEN
WORKSPACE_NOT_FOUND
VALIDATION_ERROR
CONFLICT
RATE_LIMITED
PLAN_UPGRADE_REQUIRED
USAGE_LIMIT_REACHED
INTERNAL_ERROR
```

除登录外，所有接口要求有效 Session。需要 Workspace 的接口从当前 Workspace
上下文读取 `workspaceId`，不能仅信任请求体。

## Auth

### POST /api/dev/session

仅本地开发。请求可选 `{ "profileKey": "browser-default" }`，创建或复用本地开发
用户和默认 Workspace，返回一次 dev session、Free Subscription 和 Workspace。
不接收账号密码，不属于生产认证。

### POST /api/auth/login

请求：

```json
{
  "email": "creator@example.test",
  "password": "submitted-over-tls"
}
```

响应：`User`、可访问 Workspace 摘要，并通过 Secure HttpOnly Cookie 建立 Session。

错误：`INVALID_CREDENTIALS`、`ACCOUNT_LOCKED`、`RATE_LIMITED`。

权限：公开。套餐校验：否。

### POST /api/auth/logout

请求：无正文。响应：`200`，`data: null`。

权限：已登录。套餐校验：否。服务端撤销当前 Session。

### GET /api/auth/me

响应：

```json
{
  "data": {
    "user": { "id": "usr_01", "displayName": "林墨" },
    "workspace": { "id": "ws_01", "role": "owner" },
    "subscription": { "planId": "free", "status": "active" }
  }
}
```

权限：已登录。套餐校验：否。

## Workspace

### GET /api/workspaces/current

返回当前 dev session 的 Workspace、Role 和 Subscription 摘要。

### GET /api/workspaces

响应：当前用户有权限的 Workspace 列表和 Role。

权限：已登录。套餐校验：否。

### POST /api/workspaces

请求：

```json
{
  "name": "技术内容引擎",
  "slug": "tech-content"
}
```

响应：新 Workspace 和 Owner Membership。

错误：`VALIDATION_FAILED`、`WORKSPACE_LIMIT_REACHED`、`CONFLICT`。

权限：已登录。套餐校验：是，校验可创建 Workspace 数量。

### GET /api/workspaces/:id

响应：Workspace、当前 Role、成员数和非敏感设置。

权限：WorkspaceMember。套餐校验：否。

## Articles

### GET /api/articles

Query：

```text
status=draft|published|archived
cursor=...
limit=20
search=...
```

响应：Article 摘要分页列表，不默认返回完整正文。

权限：`viewer+`。套餐校验：否。

### POST /api/articles

请求：

```json
{
  "title": "未命名草稿",
  "summary": "",
  "bodyHtml": "<p>开始写作</p>",
  "tags": []
}
```

响应：Article。

错误：`ARTICLE_LIMIT_REACHED`、`VALIDATION_FAILED`。

权限：`editor+`。套餐校验：`canCreateArticle`。

### GET /api/articles/:id

响应：Article、版本号、最近 ChannelVersion 摘要。

权限：`viewer+`。套餐校验：否。

### PUT /api/articles/:id

请求：

```json
{
  "version": 12,
  "title": "更新后的标题",
  "summary": "摘要",
  "bodyHtml": "<p>已过滤正文</p>",
  "tags": ["AI"]
}
```

响应：更新后的 Article 与新的 `version`。

错误：`VERSION_CONFLICT`、`VALIDATION_FAILED`、`ARTICLE_NOT_FOUND`。

权限：`editor+`。套餐校验：否。后端再次执行 HTML sanitizer，并将平台版本标为 stale。

### DELETE /api/articles/:id

请求：可选 `{ "expectedVersion": 12 }`。

响应：`200`，`data: null`。

权限：`editor+`；永久删除可要求 `admin+`。套餐校验：否。

## Channels

### GET /api/channels

响应：

```json
{
  "data": [{
    "id": "chn_01",
    "platformId": "halo",
    "displayName": "技术博客",
    "connectionStatus": "connected",
    "credentialStorage": "server_managed",
    "lastVerifiedAt": "2026-06-14T12:00:00Z"
  }]
}
```

不得返回 Token、Authorization Header、Cookie 或密文。

权限：`viewer+`。套餐校验：否。

### POST /api/channels

请求：

```json
{
  "platformId": "halo",
  "displayName": "技术博客",
  "configuration": {
    "baseUrl": "https://blog.example.test",
    "publishMode": "create_draft"
  },
  "credentialSubmission": "one-time-protected-value"
}
```

响应：Channel 状态；凭据写入后不回传。

错误：`CHANNEL_LIMIT_REACHED`、`INVALID_CREDENTIAL`、`VALIDATION_FAILED`。

权限：`admin+`。套餐校验：`canConnectChannel`。

### PUT /api/channels/:id

请求：非敏感配置和可选一次性新凭据。

响应：更新后的非敏感 Channel。

权限：`admin+`。套餐校验：连接数量变化时校验。

### POST /api/channels/:id/test

请求：`{ "operation": "validate_connection" }`。

响应：`202` 和 ConnectionTest ID，由 Worker 测试。

错误：`CHANNEL_NOT_CONNECTED`、`RATE_LIMITED`。

权限：`admin+`。套餐校验：是，可计入连接测试额度。

## Publish

### POST /api/publish-batches

请求：

```json
{
  "articleId": "art_01",
  "articleVersion": 12,
  "channelVersionIds": ["cv_01", "cv_02"],
  "strategy": "automatic_first",
  "scheduleAt": null,
  "postActions": ["write_back", "notify"],
  "idempotencyKey": "client-generated-unique-key"
}
```

响应：`202 Accepted`

```json
{
  "data": {
    "id": "pb_01",
    "status": "queued",
    "taskCount": 2,
    "taskIds": ["pt_01", "pt_02"]
  }
}
```

错误：`STALE_CHANNEL_VERSION`、`VALIDATION_FAILED`、
`PUBLISH_BATCH_LIMIT_REACHED`、`PLAN_UPGRADE_REQUIRED`、`CONFLICT`。

权限：`editor+`。套餐校验：`canPublishBatch`，定时任务额外校验
`canSchedulePublish`。

### GET /api/publish-batches

Query：`cursor`、`limit`、`status`、`articleId`。

响应：批次分页列表和结果计数。

权限：`viewer+`。套餐校验：否。

### GET /api/publish-batches/:id

响应：PublishBatch、不可变快照摘要、PublishTask 列表和远程结果。

权限：`viewer+`。套餐校验：否。

### POST /api/publish-tasks/:id/retry

请求：

```json
{
  "reason": "user_requested",
  "idempotencyKey": "retry-unique-key"
}
```

响应：`202` 和新的重试状态。

错误：`TASK_NOT_RETRYABLE`、`CHANNEL_REAUTHORIZATION_REQUIRED`、
`USAGE_LIMIT_REACHED`。

权限：`editor+`。套餐校验：可计入发布额度或重试额度，策略需明确。

## AI

### POST /api/ai/capabilities/:id/run

请求：

```json
{
  "articleId": "art_01",
  "articleVersion": 12,
  "channelId": "xiaohongshu",
  "inputs": {
    "tone": "专业、清晰",
    "targetAudience": "技术创作者"
  },
  "promptTemplateVersion": "ptv_03",
  "idempotencyKey": "ai-run-key"
}
```

响应：`202` 和 AIJob ID。结果通过任务查询或事件回传。

错误：`AI_CAPABILITY_NOT_FOUND`、`AI_ADAPTATION_LIMIT_REACHED`、
`PLAN_UPGRADE_REQUIRED`、`INPUT_TOO_LARGE`。

权限：`editor+`。套餐校验：`canUseAICapability`。

## Billing

### GET /api/billing/plan

响应：Plan、Subscription、Entitlement 和当前周期 UsageQuota。

权限：`viewer+`。套餐校验：否。

### POST /api/billing/checkout

请求：

```json
{
  "planId": "pro",
  "billingCycle": "monthly",
  "successUrl": "https://app.example.test/billing",
  "cancelUrl": "https://app.example.test/billing"
}
```

响应：短时 Checkout URL。

错误：`PLAN_NOT_FOUND`、`BILLING_NOT_AVAILABLE`。

权限：`owner`。套餐校验：否。

### POST /api/billing/portal

响应：短时 Billing Portal URL。

权限：`owner`。套餐校验：否。

### GET /api/usage

Query：`period=2026-06`。

响应：

```json
{
  "data": {
    "period": "2026-06",
    "articles": { "used": 5, "limit": 20 },
    "publishBatches": { "used": 3, "limit": 10 },
    "aiAdaptations": { "used": 12, "limit": 30 },
    "connectedChannels": { "used": 2, "limit": 2 }
  }
}
```

权限：`viewer+`。套餐校验：否。

## API 安全要求

- 所有输入使用 schema validator。
- 所有资源查询同时校验 `workspaceId`。
- 状态修改接口校验 CSRF 和幂等键。
- 凭据提交接口禁止记录正文。
- 列表接口限制最大页大小。
- 错误响应不返回第三方原始敏感响应。
- Usage 和 Billing 状态只以服务端为准。
