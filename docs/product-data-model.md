# Product Data Model

更新日期：2026-06-14

## 建模原则

- 主文章、渠道、平台能力、渠道版本和发布任务分开保存，避免平台状态混入文章正文。
- UI 使用派生视图，不直接把卡片文案当作领域状态。
- 未验证的平台能力保留为能力字段，不因原型交互而自动升级为已验证。
- 发布批次只接收“已选择且就绪”的发布任务。
- 授权、校验、失败、重试和数据回流都保留可追踪字段。

当前 `app.js` 通过 `createProductState()` 创建规范化状态，通过
`getChannelViews()` 组合为队列卡片需要的视图。`storage.js` 将完整工作区保存为
schema version 3 的本地快照，`mergePersistedState()` 负责用当前默认结构补齐迁移数据。
`currentArticle` 与历史快照分开保存，发布记录不读取持续变化的编辑态。

## Article

一篇可持续编辑、生成多个平台版本的主内容。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | 文章稳定标识 |
| `title` | string | 主文章标题 |
| `slug` | string | 自建站路径或内部可读标识 |
| `status` | string | `draft`、`review`、`published` 等 |
| `contentFormat` | string | Markdown、HTML 或结构化文档格式 |
| `summary` | string | 主文章摘要，也是当前 SEO 摘要来源 |
| `bodyHtml` | string | 可编辑正文 HTML |
| `wordCount` | number | 主文章字数 |
| `readingMinutes` | number | 预计阅读时长 |
| `seoSummaryLength` | number | SEO 摘要当前长度 |
| `cover` | Cover | 封面来源、URL、替代文本、比例与平台裁剪基础 |
| `tags` | string[] | 主文章标签 |
| `createdAt` | ISO string | 创建时间 |
| `updatedAt` | ISO string | 最近编辑时间 |
| `savedAt` | ISO string | 最近成功写入本地存储的时间 |

```json
{
  "id": "article-agent-workflow",
  "title": "从单体应用到 AI Agent：一次内容工作流重构",
  "status": "draft",
  "contentFormat": "markdown",
  "wordCount": 3286,
  "cover": {
    "sourceType": "generated",
    "url": "assets/article-cover.png",
    "alt": "一个内容节点分发为多个渠道版本的抽象工作流",
    "aspectRatio": "16:9",
    "platformCrops": []
  }
}
```

当前对应：`INITIAL_ARTICLE` 和 `productState.currentArticle`。

### Cover

| 字段 | 类型 | 含义 |
|---|---|---|
| `sourceType` | string | `generated`、`uploaded` 或 `remote` |
| `url` | string | 当前封面资源地址；本地 MVP 只保存地址 |
| `alt` | string | 无障碍替代文本 |
| `aspectRatio` | string | 主封面比例 |
| `description` | string | 可编辑封面说明 |
| `platformCrops` | PlatformCrop[] | 各平台裁剪意图 |

`PlatformCrop` 包含 `platformId`、`ratio`、`cropHint` 和 `status`。Phase 2.5
只建立模型与说明/alt 编辑，不存储图片二进制，也不实现复杂裁剪器。

## Channel

用户配置的发布目的地及其账号连接状态。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | 渠道稳定标识 |
| `platform` | string | 平台名称 |
| `mark` | string | 队列中的紧凑平台标记 |
| `type` | string | `文章`、`图文`、`短视频` |
| `capabilityId` | string | 关联 PlatformCapability |
| `selected` | boolean | 是否加入当前发布选择 |
| `account.authorizationStatus` | string | `authorized`、`missing`、`expired`、`unverified` |
| `account.label` | string | 面向用户的授权状态文案 |
| `account.tone` | string | 状态视觉语义 |
| `account.connectedAt` | ISO string/null | 最近连接时间 |

```json
{
  "id": "xiaohongshu",
  "platform": "小红书",
  "type": "图文",
  "capabilityId": "xiaohongshu-capability",
  "selected": true,
  "account": {
    "authorizationStatus": "unverified",
    "label": "能力待验证",
    "tone": "warning"
  }
}
```

当前对应：`productState.channels`。

## ChannelVersion

由主文章生成的某个平台专属版本。它是发布前编辑和校验的核心对象。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | 渠道版本标识 |
| `articleId` | string | 关联 Article |
| `channelId` | string | 关联 Channel |
| `title` | string | 平台版本标题 |
| `versionStatus` | string | `current` 或 `needs_adaptation` |
| `sourceArticleUpdatedAt` | ISO string | 生成该版本时对应的主文章更新时间 |
| `queueGroup` | string | 当前队列分组 |
| `adaptationProgress` | number | 适配进度 0 至 100 |
| `deliveryMethod` | string | 自动发布、生成草稿、复制发布、需人工确认 |
| `status` | PublishStatus | 版本当前状态 |
| `detail` | string | 队列中的业务说明 |
| `generatedAssets` | string[] | 已生成的标题、封面、脚本、话题等 |
| `missingItems` | string[] | 发布前仍缺失的内容或动作 |
| `riskNotes` | string[] | 发布风险和能力限制 |
| `updatedAt` | ISO string | 最近生成或编辑时间 |

```json
{
  "id": "douyin-version-001",
  "articleId": "article-agent-workflow",
  "channelId": "douyin",
  "adaptationProgress": 62,
  "deliveryMethod": "需人工确认",
  "status": "needs_authorization",
  "generatedAssets": ["标题", "封面", "脚本", "话题", "视频描述"],
  "missingItems": ["应用授权", "封面终审", "脚本终审"]
}
```

当前对应：`productState.channelVersions`。

## PlatformCapability

平台在当前产品版本中已知且可验证的能力声明。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | 能力记录标识 |
| `channelId` | string | 关联 Channel |
| `contentTypes` | string[] | 支持的内容类型 |
| `supportsAutomaticPublish` | boolean | 是否支持自动发布 |
| `supportsDraft` | boolean | 是否支持产品内或平台侧草稿流程 |
| `requiresCopyPublish` | boolean | 是否需要复制到平台 |
| `requiresAuthorization` | boolean | 是否需要账号授权 |
| `requiresHumanConfirmation` | boolean | 是否需要人工确认 |
| `requiresRepurpose` | boolean | 是否需要内容再加工 |
| `generatedAssets` | string[] | 需要生成的平台素材 |
| `verificationStatus` | string | `prototype-verified` 或 `unverified` |

```json
{
  "id": "blog-capability",
  "channelId": "blog",
  "contentTypes": ["文章"],
  "supportsAutomaticPublish": true,
  "requiresHumanConfirmation": false,
  "verificationStatus": "prototype-verified"
}
```

当前对应：`productState.platformCapabilities`。能力判断依据另见
`docs/platform-capability-matrix.md`。

## PublishTask

一个渠道版本的一次可执行发布任务。失败重试和结果回写都记录在任务上。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | 发布任务标识 |
| `channelId` | string | 关联 Channel |
| `channelVersionId` | string | 关联 ChannelVersion |
| `scope` | string | `workspace` 为当前队列任务，`batch` 为历史不可变执行任务 |
| `batchId` | string/null | 批次任务所属 PublishBatch |
| `channelVersionSnapshotId` | string/null | 批次创建时的平台版本快照 |
| `status` | PublishStatus | 任务状态 |
| `action` | string | 当前 UI 操作 |
| `retryCount` | number | 已重试次数 |
| `maxRetries` | number | 自动重试上限 |
| `lastError` | string/null | 最近失败原因 |
| `publishedUrl` | string/null | 发布成功后的平台链接 |
| `feedback` | object/null | 数据回流结果 |

```json
{
  "id": "itpub-task-001",
  "channelId": "itpub",
  "channelVersionId": "itpub-version-001",
  "status": "failed",
  "retryCount": 0,
  "maxRetries": 2,
  "lastError": "平台编辑器连接超时"
}
```

当前对应：`productState.publishTasks`。`applyChannelTransition()` 处理确认、
授权和重试。

## PublishBatch

一次批量发布操作，只包含创建批次时已选择且就绪的任务。批次本身只引用
不可变快照，不依赖后续继续变化的 `currentArticle` 或 `channelVersions`。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | 发布批次标识 |
| `articleId` | string | 关联 Article |
| `taskIds` | string[] | 本批次的 PublishTask |
| `channelIds` | string[] | 批次渠道快照，供详情和复用使用 |
| `articleSnapshotId` | string | 关联 ArticleSnapshot |
| `channelCount` | number | 本批次渠道数量 |
| `successCount` | number | 本地模拟成功数量 |
| `pendingCount` | number | 等待平台侧人工提交数量 |
| `failedCount` | number | 创建批次时的失败数量 |
| `status` | PublishStatus | 批次状态 |
| `schedule` | string | 立即发布或定时信息 |
| `strategy` | string | 自动优先、人工确认等策略 |
| `postActions` | string[] | 回写、通知、复盘等动作 |
| `createdAt` | ISO string | 批次创建时间 |
| `completedAt` | ISO string/null | 批次结束时间 |

```json
{
  "id": "batch-001",
  "articleId": "article-agent-workflow",
  "articleSnapshotId": "batch-001-article-snapshot",
  "taskIds": ["batch-001-blog-task"],
  "status": "queued",
  "schedule": "now",
  "strategy": "automatic-first",
  "postActions": ["write-back", "notify"]
}
```

当前对应：`productState.publishBatches` 和 `createPublishBatch()`。

## ArticleSnapshot

创建发布批次时复制的文章不可变快照。字段以 Article 为基础，额外包含
`sourceArticleId` 和 `createdAt`。当前对应 `productState.articleSnapshots`。
发布记录标题、摘要、正文、标签与封面均从该快照读取。

## ChannelVersionSnapshot

每个批次 PublishTask 创建时复制的平台版本快照。字段以 ChannelVersion 为
基础，额外包含 `sourceChannelVersionId` 和 `createdAt`。当前对应
`productState.channelVersionSnapshots`，保存平台版本标题、发布方式、缺失项与
风险说明。

## Workspace 根状态

```json
{
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
```

`publishTasks` 同时包含当前工作区任务和批次任务，通过 `scope` 与 `batchId`
区分。后端化时建议拆成 draft task 与 execution task 两张表。

## PublishStatus

跨渠道版本、发布任务和发布批次共享的状态枚举。

| 值 | 含义 |
|---|---|
| `draft` | 尚未开始适配 |
| `adapting` | 正在生成平台版本 |
| `needs_review` | 等待人工确认 |
| `ready` | 可以进入自动发布批次 |
| `manual_delivery` | 已确认，但仍需复制或平台侧提交 |
| `needs_authorization` | 缺少有效授权 |
| `needs_repurpose` | 需要内容再加工 |
| `failed` | 发布或连接失败 |
| `queued` | 已加入发布批次 |
| `publishing` | 正在发布 |
| `published` | 发布成功 |
| `partial` | 批次部分成功 |

当前对应：`PUBLISH_STATUS` 和 `STATUS_PRESENTATION`。中文状态只在视图层
生成，不作为领域判断条件。

## ValidationIssue

发布前校验产生的结构化问题，可被解决并保留历史。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | 校验问题标识 |
| `channelVersionId` | string | 关联 ChannelVersion |
| `severity` | string | `info`、`warning`、`error` |
| `code` | string | 稳定的问题代码 |
| `field` | string | 问题所属字段或领域 |
| `message` | string | 用户可理解的问题说明 |
| `resolved` | boolean | 是否已解决 |
| `createdAt` | ISO string | 问题产生时间 |
| `resolvedAt` | ISO string/null | 问题解决时间 |

```json
{
  "id": "csdn-version-001-authorization",
  "channelVersionId": "csdn-version-001",
  "severity": "error",
  "code": "authorization_required",
  "field": "authorization",
  "message": "平台授权已过期，需要重新授权。",
  "resolved": false
}
```

当前对应：`productState.validationIssues`。授权和重试成功后，相关问题会被
标记为 `resolved`，而不是从历史中直接删除。

## WorkspaceSettings

当前工作台的本地偏好，不与文章正文混合。

| 字段 | 类型 | 含义 |
|---|---|---|
| `queueDensity` | string | `comfortable` 或 `compact` |
| `activeView` | string | `workbench` 或 `history` |
| `publishTime` | string | 当前发布时间选择 |
| `publishStrategy` | string | 当前发布策略 |
| `postAction` | string | 当前发布后动作 |

```json
{
  "queueDensity": "compact",
  "activeView": "workbench",
  "publishTime": "now",
  "publishStrategy": "自动优先，失败重试",
  "postAction": "回写数据并通知"
}
```

当前对应：`productState.workspaceSettings`。

## Phase 2 持久化边界

1. Article、Channel、ChannelVersion、PlatformCapability、PublishTask、
   PublishBatch、ValidationIssue 和 WorkspaceSettings 作为一个版本化快照写入
   `localStorage`。
2. PlatformCapability 仍是产品内能力声明，不能替代真实平台接入验证。
3. 授权令牌不进入本地快照，只保存授权状态和演示时间。
4. PublishTask 和 PublishBatch 已形成可恢复的本地发布记录。
5. 封面目前只保存资源路径和说明，不保存用户上传的二进制文件。
6. 接后端时应按模型拆分 API，并使用服务端版本号或 ETag 处理并发更新。

## Phase 5 SaaS Identity And Billing Models

身份、Session、Workspace 与 Membership 已在 Prisma 中实现；Billing Provider
仍是目标模型。

### User

平台用户身份。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | 用户 ID |
| `email` | string | 已规范化邮箱 |
| `name` | string | 显示名称 |
| `avatarUrl` | string/null | 头像地址 |
| `passwordHash` | string/null | Argon2id hash，不进入 API |
| `status` | string | `active`、`suspended` |
| `createdAt` | ISO string | 创建时间 |
| `updatedAt` | ISO string | 更新时间 |

```json
{
  "id": "usr_01",
  "email": "creator@example.test",
  "name": "林墨",
  "status": "active"
}
```

### Workspace

内容、渠道、成员、订阅和用量的租户边界。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | Workspace ID |
| `name` | string | 工作区名称 |
| `slug` | string | URL 标识 |
| `ownerId` | string/null | 所有者 User |
| `plan` | string | `free`、`pro`、`studio` |
| `createdAt` | ISO string | 创建时间 |

```json
{
  "id": "ws_01",
  "name": "技术内容引擎",
  "slug": "tech-content",
  "ownerId": "usr_01",
  "plan": "free"
}
```

### WorkspaceMember

User 与 Workspace 的成员关系。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | 成员关系 ID |
| `workspaceId` | string | Workspace |
| `userId` | string | User |
| `role` | string | `owner`、`admin`、`editor`、`viewer` |
| `createdAt` | ISO string | 加入时间 |

```json
{
  "id": "wsm_01",
  "workspaceId": "ws_01",
  "userId": "usr_01",
  "role": "owner"
}
```

### Role

工作区权限集合。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | Role ID |
| `key` | string | `owner`、`admin`、`editor`、`viewer` |
| `name` | string | 展示名称 |
| `permissions` | string[] | 稳定权限代码 |
| `system` | boolean | 是否系统内置 |

```json
{
  "id": "role_editor",
  "key": "editor",
  "name": "编辑",
  "permissions": ["article.write", "publish.create", "ai.run"],
  "system": true
}
```

### Session

服务端登录 Session。原始 token 只通过 HttpOnly Cookie 或开发 Header 传输，数据库
仅保存 hash。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | Session ID |
| `userId` | string | User |
| `workspaceId` | string | 当前 Workspace |
| `tokenHash` | string | HMAC hash，不进入 API |
| `kind` | string | `auth` 或 `dev` |
| `expiresAt` | ISO string | 过期时间 |
| `userAgent` | string/null | 截断后的客户端标识 |
| `ipHash` | string/null | IP 的不可逆 hash |
| `createdAt` | ISO string | 创建时间 |

```json
{
  "id": "ses_01",
  "userId": "usr_01",
  "workspaceId": "ws_01",
  "kind": "auth",
  "expiresAt": "2026-07-14T00:00:00Z"
}
```

### AuthIdentity

用户的密码、OAuth 或企业身份提供方关系。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | Provider 关系 ID |
| `userId` | string | User |
| `provider` | string | `password`、`github`、`google` 等 |
| `providerUserId` | string | Provider 用户标识 |
| `createdAt` | ISO string | 绑定时间 |

```json
{
  "id": "auth_01",
  "userId": "usr_01",
  "provider": "password",
  "providerUserId": "creator@example.test"
}
```

### Plan

可销售套餐定义。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | `free`、`pro`、`studio` |
| `name` | string | 展示名称 |
| `status` | string | `active`、`archived` |
| `billingInterval` | string/null | `month`、`year` 或免费 |
| `priceMinor` | number | 最小货币单位价格 |
| `currency` | string | ISO 货币代码 |
| `entitlementIds` | string[] | 套餐权限 |

```json
{
  "id": "pro",
  "name": "Pro",
  "status": "active",
  "billingInterval": "month",
  "priceMinor": 0,
  "currency": "CNY"
}
```

`priceMinor` 在产品定价确认前保持配置值，不由前端写死。

### Subscription

Workspace 的套餐订阅状态。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | Subscription ID |
| `workspaceId` | string | Workspace |
| `planId` | string | Plan |
| `status` | string | `trialing`、`active`、`past_due`、`cancelled` |
| `currentPeriodStart` | ISO string | 计费周期开始 |
| `currentPeriodEnd` | ISO string | 计费周期结束 |
| `cancelAtPeriodEnd` | boolean | 是否周期末取消 |
| `providerSubscriptionId` | string/null | 支付平台 ID |

```json
{
  "id": "sub_01",
  "workspaceId": "ws_01",
  "planId": "free",
  "status": "active",
  "cancelAtPeriodEnd": false
}
```

### Entitlement

一个稳定功能或额度声明。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | Entitlement ID |
| `key` | string | 如 `publish.schedule` |
| `type` | string | `boolean`、`quota`、`enum` |
| `value` | boolean/number/string | 权限值 |
| `source` | string | `plan`、`trial`、`override` |
| `effectiveAt` | ISO string | 生效时间 |
| `expiresAt` | ISO string/null | 过期时间 |

```json
{
  "id": "ent_01",
  "key": "publish.schedule",
  "type": "boolean",
  "value": true,
  "source": "plan"
}
```

### UsageQuota

当前周期的额度聚合。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | Quota ID |
| `workspaceId` | string | Workspace |
| `key` | string | `ai.adaptation` 等 |
| `periodStart` | ISO string | 周期开始 |
| `periodEnd` | ISO string | 周期结束 |
| `limit` | number/null | 限制，null 表示不限 |
| `used` | number | 已使用 |
| `reserved` | number | 已预留未结算 |

```json
{
  "id": "quota_01",
  "workspaceId": "ws_01",
  "key": "publish.batch",
  "limit": 10,
  "used": 3,
  "reserved": 0
}
```

### UsageRecord

一次不可变用量事件。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | Usage ID |
| `workspaceId` | string | Workspace |
| `key` | string | 用量类型 |
| `quantity` | number | 数量 |
| `resourceType` | string | 业务资源类型 |
| `resourceId` | string | 业务资源 ID |
| `idempotencyKey` | string | 防重复计量 |
| `occurredAt` | ISO string | 发生时间 |

```json
{
  "id": "usage_01",
  "workspaceId": "ws_01",
  "key": "ai.adaptation",
  "quantity": 1,
  "resourceType": "AIJob",
  "resourceId": "aijob_01",
  "idempotencyKey": "ai-run-01"
}
```

### BillingCustomer

Workspace 与支付平台客户的关系。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | BillingCustomer ID |
| `workspaceId` | string | Workspace |
| `provider` | string | 支付 Provider |
| `providerCustomerId` | string | Provider 客户 ID |
| `billingEmail` | string | 账单邮箱 |
| `taxMetadata` | object | 发票或税务元数据 |
| `createdAt` | ISO string | 创建时间 |

```json
{
  "id": "bc_01",
  "workspaceId": "ws_01",
  "provider": "billing-provider",
  "providerCustomerId": "customer_01",
  "billingEmail": "billing@example.test"
}
```

## SaaS 根关系

```text
User -> WorkspaceMember -> Workspace
Workspace -> Articles / Channels / PublishBatches / Usage
Workspace -> BillingCustomer -> Subscription -> Plan
Plan + overrides -> Entitlement
Business operation -> UsageRecord -> UsageQuota
```

前端的 `createSaasState()` 和 `entitlements.js` 是这些模型的产品原型，不是服务端
权威数据。
