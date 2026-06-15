# Publish Batch Flow

更新日期：2026-06-15

## 状态链路

```text
编辑主文章
  -> ChannelVersion.versionStatus = needs_adaptation
  -> 重新适配
  -> needs_review
  -> 人工确认
  -> ready
  -> 复制 ArticleSnapshot
  -> 为每个渠道复制 ChannelVersionSnapshot
  -> 创建批次级 PublishTask 与 PublishBatch
  -> 自动渠道 published / 半自动渠道 queued
  -> 发布记录与后续数据回流
```

## 进入批次的条件

渠道必须同时满足：

1. 已被用户选择。
2. 平台版本不是过期版本。
3. 当前状态为 `ready`。
4. 授权不是 `missing` 或 `expired`。
5. 没有未处理的发布失败。

待确认、需重新适配、未授权和失败渠道不会被加入立即发布批次。

## 本地模拟规则

- 自建 Blog 作为已验证自动发布示例，创建批次后记为成功。
- 生成草稿、复制发布和人工确认渠道在批次中记为待平台侧处理。
- Phase 2 不向任何第三方平台发送请求。
- 批次保存 ArticleSnapshot、ChannelVersionSnapshot、渠道、策略和结果计数。

## 不可变快照

`createPublishBatch()` 在同一次内存事务中完成：

1. 复制 `currentArticle` 为 `ArticleSnapshot`，正文再次经过 sanitizer。
2. 为每个就绪渠道复制对应 `ChannelVersionSnapshot`。
3. 创建新的批次级 `PublishTask`，引用平台版本快照。
4. `PublishBatch` 引用文章快照和批次任务 ID。
5. 当前工作区任务可以继续变化，但历史详情只读取快照与批次任务。

因此批次创建后继续编辑文章、重新适配平台版本或修改队列选择，都不会改变
历史发布记录。复用批次只恢复渠道选择，不修改旧快照。

## 发布记录

发布记录页从 `PublishBatch` 派生以下信息：

- 发布时间
- 文章标题
- 渠道数量
- 成功、待确认和失败数量
- 发布策略
- 查看详情
- 复用渠道为新批次

复用不会立即创建新记录，只恢复原批次渠道选择和可发布任务。用户仍需在工作台
检查并点击发布。

## Phase 6 Halo 批次

服务端 Halo 渠道进入批次后，Publisher Router 将任务交给 Halo Worker：

1. 校验套餐、Workspace、ChannelConfig、密文、正文、sanitizer、slug 和 stale。
2. `POST` Halo Console API 创建草稿。
3. 默认停在 `draft_created`。
4. 仅当配置为 `publish` 时，再调用 publish endpoint。
5. PublishTask 回写 Post Name、编辑/预览/公开链接、远程状态和时间。
6. 失败任务保留不可变快照，可通过 retry API 重试。

## 后端接入风险

- 第三方平台授权、验证码、审核和风控可能阻断自动化。
- 自动发布必须具备幂等键，避免网络重试产生重复内容。
- PublishBatch、ArticleSnapshot、ChannelVersionSnapshot 与 PublishTask 应由
  服务端事务创建，PublishTask 应独立重试。
- 平台回调和轮询结果需要统一映射为内部 PublishStatus。
- 复制发布渠道无法自动证明最终提交成功，需要人工回执或浏览器自动化实验。
