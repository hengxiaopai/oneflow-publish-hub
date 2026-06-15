# Platform Token Handling

更新日期：2026-06-15

## Halo PAT 生命周期

1. owner/admin 在渠道设置中输入 PAT。
2. 浏览器通过受认证 HTTPS 请求提交一次。
3. Fastify 使用 `ENCRYPTION_KEY` 和 AES-256-GCM 加密。
4. 数据库只保存 `encryptedCredential`。
5. API 只返回 `credentialStatus` 和连接测试状态。
6. Halo Worker 执行任务时临时解密，完成请求后不持久化明文。
7. “清除凭据”会删除密文并阻止后续真实发布。

## 禁止流向

PAT 不得进入：

- Git、`.env.example` 或前端 bundle
- `localStorage`、`sessionStorage` 或工作区导出
- API 响应、OpenAPI 示例或测试快照
- 日志、Toast、截图、PublishTask result
- `rawResponseSummary` 或第三方错误原文

## 生产升级

当前本地 SaaS MVP 使用应用级 `ENCRYPTION_KEY`。生产环境需要 KMS 或 Secret Manager、
envelope encryption、key version、轮换审计和最小权限 Worker。所有凭据提交必须通过
TLS，并补充 CSRF 防护和操作审计。
