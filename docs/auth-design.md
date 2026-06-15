# Authentication Design

更新日期：2026-06-15

## Phase 5 实现

OneFlow 现在支持密码注册、密码登录、持久 Session、`auth/me` 和退出登录。
本地演示、SaaS Dev Session 与真实 SaaS Auth 是三条明确分离的入口。

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

注册会创建 `User`、密码 `AuthIdentity`、Owner `WorkspaceMember`、Free
`Workspace` 与 `Subscription`。OAuth 仅保留 `AuthIdentity.provider` 模型占位。

## 密码与 Session

- 密码使用 Argon2id，数据库只保存 `passwordHash`。
- 登录失败统一返回 `INVALID_CREDENTIALS`，不说明邮箱是否存在。
- 随机 Session token 只通过 `oneflow_session` Cookie 发送。
- Cookie 为 `HttpOnly`、`SameSite=Lax`，生产环境启用 `Secure`。
- 数据库仅保存 token 的 HMAC-SHA-256 hash。
- 默认有效期为 168 小时，可通过 `SESSION_TTL_HOURS` 调整。
- 退出登录删除 Session 记录并清除 Cookie。
- 前端请求使用 `credentials: include`，不读取或持久化 Session token。

## Dev Session

`POST /api/dev/session` 只在 `NODE_ENV !== production` 时可用。它继续使用
`x-oneflow-dev-session` 支持本地调试，但 token 同样只以 hash 形式写入 Session 表。
生产环境固定返回 `DEV_ONLY_DISABLED`。

## 当前限制

- 尚未实现邮箱验证、密码重置、MFA、设备管理和 Session 管理页面。
- 尚未接 GitHub/Google OAuth。
- Cookie Session 已具备最小安全边界，但生产部署仍应增加 CSRF 防护与异常登录审计。
