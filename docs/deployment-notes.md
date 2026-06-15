# Deployment Notes

更新日期：2026-06-15

## Docker 本地开发

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Compose 只启动后端，前端继续通过 `npm run dev:frontend` 静态运行。SQLite 数据位于 `oneflow-sqlite` named volume。

示例环境变量仅用于本地开发。公开部署前必须替换 `ENCRYPTION_KEY` 与 `SESSION_SECRET`，并把 `CORS_ORIGIN` 限制为真实前端域名。

## 生产边界

当前 Dockerfile 是部署准备骨架，不代表生产就绪：

- SQLite 仅适合单实例开发；生产使用
  `server/prisma/schema.postgresql.prisma` 迁移 PostgreSQL。
- Phase 5 已提供密码 Auth 与数据库 Session；生产仍需邮箱验证、MFA、CSRF、
  Session 设备管理和异常登录审计。
- Mock Worker 与 API 同进程；生产需要独立队列、重试策略和幂等键。
- 平台凭据应由 KMS 或 Secrets Manager 管理，不能只依赖单个环境变量密钥。
- 前端与 API 应位于受控域名，生产 CORS 禁止 `*`。
- 需要在网关层补 TLS、WAF、全局限流、日志汇聚与备份策略。

详细步骤见 [PostgreSQL Migration](postgres-migration.md)。

## CI

`.github/workflows/ci.yml` 在 push 与 pull request 时运行：

1. 前端测试。
2. 后端测试。
3. JavaScript 语法与 Prisma schema 校验。
4. 基础敏感信息扫描。

CI 使用测试专用占位环境变量，不依赖 GitHub Secrets，也不执行部署。
