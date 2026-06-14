# Product Information Architecture

更新日期：2026-06-14

## 导航结构

| 模块 | 目标 | 核心页面 | 主要操作 | 关联模型 |
|---|---|---|---|---|
| 登录 / 注册 | 建立用户身份或进入本地开发模式 | 登录、注册、找回、开发模式入口 | 登录、注册、退出 | User、Session、AuthProvider |
| 仪表盘 | 聚合创作者下一步需要处理的任务 | 任务中心、额度摘要 | 写新文章、检查队列、处理失败 | Article、ChannelVersion、PublishTask、UsageQuota |
| 内容库 / 我的文章 | 管理内容资产与历史快照 | 草稿、已发布、归档、搜索 | 新建、复制、删除、打开编辑 | Article、ArticleSnapshot |
| 写作工作台 | 完成创作、AI 适配和发布前确认 | 编辑器、平台队列、预览 | 编辑、重新适配、确认、创建批次 | Article、ChannelVersion、ValidationIssue |
| 发布记录 | 追踪批次和平台任务 | 批次列表、任务详情 | 查看、重试、复用、复制链接 | PublishBatch、PublishTask |
| 渠道设置 | 管理服务端托管的平台连接 | 渠道列表、连接流程、重新授权 | 连接、测试、撤销、重新授权 | Channel、PlatformCapability |
| 图床 / 素材库 | 管理封面与平台裁剪 | 素材列表、上传、裁剪详情 | 上传、替换、删除、生成裁剪 | MediaAsset、PlatformCrop |
| AI 能力中心 | 配置可复用 AI 工作流 | 能力目录、Prompt、执行策略 | 启用、停用、自动执行、试运行 | AICapability、PromptTemplate、UsageRecord |
| 账单 / 套餐 | 展示计划、额度和升级路径 | 当前计划、使用量、套餐对比 | Checkout、Portal、查看账单 | Plan、Subscription、Entitlement |
| 团队 / 成员 | 管理 Workspace 协作 | 成员、邀请、角色 | 邀请、移除、修改角色 | WorkspaceMember、Role |
| 设置 | 管理工作区、安全和数据 | 通用、安全、导入导出、通知 | 保存、导出、删除、退出 | Workspace、WorkspaceSettings、AuditEvent |

## Hash 路由

当前原型路由：

```text
#/login
#/dashboard
#/articles
#/workbench
#/publish-history
#/channels
#/media
#/ai-capabilities
#/billing
#/team
#/settings
```

正式 SaaS 可以迁移到服务端路由，但 URL 语义应保持稳定。

## 核心用户旅程

### 首次使用

```text
注册 -> 创建 Workspace -> 选择套餐
  -> 连接第一个渠道 -> 新建文章
  -> 运行 AI 适配 -> 人工确认 -> 创建发布批次
```

### 日常发布

```text
仪表盘 -> 打开最近文章 -> 编辑
  -> 查看过期平台版本 -> 重新适配
  -> 处理授权异常 -> 创建 PublishBatch
  -> 发布记录查看 Worker 结果
```

### 额度不足

```text
用户操作 -> Entitlement 拒绝
  -> 显示当前用量与限制
  -> 账单 / 套餐 -> 服务端 Checkout
  -> Billing Webhook 更新 Subscription
```

## 页面层级原则

- 仪表盘只展示可行动任务，不展示无意义图表。
- 写作工作台保持编辑器主导，不被 SaaS 导航挤压。
- 渠道页展示连接状态，不展示凭据值。
- Billing 展示真实计划能力，不伪造收入、增长或支付结果。
- AI 能力展示输入、输出、Prompt、执行策略和人工确认边界。
