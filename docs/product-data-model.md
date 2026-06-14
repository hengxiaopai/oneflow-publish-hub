# Product Data Model

更新日期：2026-06-13

## 建模原则

- 主文章、渠道、平台能力、渠道版本和发布任务分开保存，避免平台状态混入文章正文。
- UI 使用派生视图，不直接把卡片文案当作领域状态。
- 未验证的平台能力保留为能力字段，不因原型交互而自动升级为已验证。
- 发布批次只接收“已选择且就绪”的发布任务。
- 授权、校验、失败、重试和数据回流都保留可追踪字段。

当前 `app.js` 通过 `createProductState()` 创建规范化状态，通过
`getChannelViews()` 组合为队列卡片需要的视图。`storage.js` 将完整工作区保存为
schema version 2 的本地快照，`mergePersistedState()` 负责用当前默认结构补齐旧数据。

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
| `coverAsset` | string | 主封面资源路径 |
| `coverDescription` | string | 可编辑封面说明 |
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
  "coverAsset": "assets/article-cover.png"
}
```

当前对应：`INITIAL_ARTICLE` 和 `productState.article`。

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
| `batchId` | string/null | 所属 PublishBatch |
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

一次批量发布操作，只包含创建批次时已选择且就绪的任务。

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | 发布批次标识 |
| `articleId` | string | 关联 Article |
| `taskIds` | string[] | 本批次的 PublishTask |
| `channelIds` | string[] | 批次渠道快照，供详情和复用使用 |
| `articleTitle` | string | 创建批次时的文章标题快照 |
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
  "taskIds": ["blog-task-001"],
  "status": "queued",
  "schedule": "now",
  "strategy": "automatic-first",
  "postActions": ["write-back", "notify"]
}
```

当前对应：`productState.publishBatches` 和 `createPublishBatch()`。

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
