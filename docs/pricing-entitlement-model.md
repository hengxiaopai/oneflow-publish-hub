# Pricing And Entitlement Model

更新日期：2026-06-14

## 初版套餐

| 能力 | Free | Pro | Studio / Team |
|---|---:|---:|---:|
| 最大文章数 | 20 | 500 | 不限 |
| 每月发布批次数 | 10 | 200 | 1000 |
| 每月 AI 适配次数 | 30 | 1000 | 5000 |
| 可连接渠道数 | 2 | 10 | 30 |
| 团队成员数 | 1 | 1 | 10 |
| 基础 AI 能力 | 是 | 是 | 是 |
| 平台改写与短视频能力 | 否 | 是 | 是 |
| 高级图床 | 否 | 是 | 是 |
| 数据回流 | 否 | 是 | 是 |
| 定时发布 | 否 | 是 | 是 |
| 批量发布 | 单渠道批次 | 是 | 是 |

稳定 Plan ID：

```text
free
pro
studio
```

## AI 能力分级

Free：

- 标题生成
- 摘要生成
- SEO 描述
- 标签推荐
- 发布风险检查

Pro / Studio：

- 平台风格改写
- 小红书文案
- 抖音脚本
- B站标题简介
- 公众号排版
- 全部 Free 能力

## Entitlement 决策

`entitlements.js` 提供：

```js
canCreateArticle(context)
canConnectChannel(context)
canPublishBatch(context)
canUseAICapability(context)
canInviteMember(context)
canUseImageHost(context)
canSchedulePublish(context)
canUseDataFeedback(context)
```

返回结构：

```json
{
  "allowed": false,
  "reason": "publish_batch_limit_reached",
  "limit": 10,
  "used": 10,
  "remaining": 0
}
```

## 判断顺序

1. 校验 Plan 是否存在。
2. 校验 Subscription 是否处于可用状态。
3. 应用运营覆盖项或试用 Entitlement。
4. 校验功能开关。
5. 校验当前周期 UsageQuota。
6. 校验本次操作数量，例如一个批次的渠道数。
7. 允许后写入 UsageRecord，禁止仅依赖前端计数。

## 服务端要求

- 前端权限判断只用于即时反馈，不能作为安全边界。
- API 必须重复执行同一 Entitlement 判断。
- 用量写入与业务操作应处于同一事务或可补偿流程。
- Billing Webhook 更新计划后需要使权限缓存失效。
- 所有拒绝结果使用稳定错误码，并返回当前限制与用量。

## 推荐错误码

```text
UNKNOWN_PLAN
SUBSCRIPTION_INACTIVE
ARTICLE_LIMIT_REACHED
CHANNEL_LIMIT_REACHED
PUBLISH_BATCH_LIMIT_REACHED
BATCH_CHANNEL_LIMIT_REACHED
AI_ADAPTATION_LIMIT_REACHED
TEAM_MEMBER_LIMIT_REACHED
PLAN_UPGRADE_REQUIRED
```
