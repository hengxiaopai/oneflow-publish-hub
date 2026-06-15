# Publisher Reliability

更新日期：2026-06-15

## 幂等发布

每个 `PublishTask` 在创建时生成稳定 `idempotencyKey`，输入包含：

- `workspaceId`
- ChannelConfig ID
- `platformId`
- `publishMode`
- 不可变 ArticleSnapshot
- 不可变 ChannelVersionSnapshot

时间戳字段不参与哈希。相同快照已有 `draft_created` 或 `published` 结果时，新批次复用远程结果并记录 `idempotency_reused`，不会再次请求 Halo 创建草稿。API 只返回短 hash。

## 任务锁

Halo Worker 使用数据库条件更新获得短租约锁：

- 活跃锁只允许一个执行者。
- 锁超时后允许新 Worker 回收。
- 成功或失败都在 `finally` 中释放。
- 终态任务再次执行直接返回已有结果。

当前锁适用于单数据库、进程内 Worker。迁移独立 Worker 后应替换为 PostgreSQL 行锁、Redis/BullMQ 或云队列租约。

## 重试策略

| 错误 | 自动恢复策略 |
|---|---|
| 401 / 403 | 不重试，渠道标记 `credential_invalid` |
| 404 endpoint | 不重试 |
| 409 slug conflict | 追加稳定短 hash，自动重试一次 |
| 400 / 422 payload | 不重试 |
| timeout / network / connection refused | 标记可重试并计算 `nextRetryAt` |
| Halo 5xx | 标记可重试并计算 `nextRetryAt` |

退避建议从 15 秒开始指数增长，最大 5 分钟，受 `maxRetries` 限制。Phase 6.1 尚无常驻调度器，因此 `nextRetryAt` 是可观测和后续队列调度字段，用户也可手动重试。

## 事件日志

`PublishTaskEvent` 保存安全时间线，包括任务创建、校验、锁、Halo 请求、草稿、发布、重试和完成事件。metadata 会递归移除 token、credential、Authorization、Cookie、secret 和 session 字段。

事件不保存请求 Header 或 PAT。发布记录只展示安全远程状态、耗时、错误码和已脱敏 metadata。
