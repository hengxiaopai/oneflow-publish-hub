# Phase 6 Backend Setup

更新日期：2026-06-15

## 定位

Phase 6 后端提供 Fastify API、Prisma、SQLite 本地开发、PostgreSQL 兼容 schema、
Argon2id 密码认证、持久 Cookie Session、Workspace RBAC、服务端 Entitlement、
凭据加密、Mock Publisher 与服务端 Halo Publisher。

## 环境要求

- Node.js 22.11 或更高版本
- npm
- 前端静态服务器，默认 `http://127.0.0.1:4173`
- 后端端口，默认 `http://127.0.0.1:4174`

## 初始化

```powershell
Copy-Item .env.example .env
npm --prefix server install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run dev` 同时启动前端与后端。也可分别使用 `npm run dev:frontend` 和
`npm run dev:server`。

需要在没有真实 Halo 实例时复现服务端发布链路，可另开终端运行：

```powershell
npm run dev:fake-halo
```

该测试桩默认监听 `http://127.0.0.1:4180`，仅模拟连接检查、创建草稿和发布草稿，
不保存 PAT，也不用于生产环境。

打开 `http://127.0.0.1:4173/#/login`，选择：

- `Local Demo Mode`：继续使用 `localStorage`，后端未启动也可用。
- `SaaS Dev Mode`：调用 `/api/dev/session`，文章、渠道、用量和发布批次使用后端。
- `SaaS Auth Mode`：通过 `/api/auth/register` 或 `/api/auth/login` 使用真实账号
  与 httpOnly Cookie Session。

## 环境变量

```text
PORT=4174
HOST=127.0.0.1
DATABASE_URL=file:./dev.db
ENCRYPTION_KEY=replace-with-a-long-random-local-key
SESSION_SECRET=replace-with-a-different-long-random-session-secret
SESSION_COOKIE_NAME=oneflow_session
SESSION_TTL_HOURS=168
CORS_ORIGIN=http://127.0.0.1:4173
BODY_LIMIT=3145728
AUTH_RATE_LIMIT_MAX=12
DEV_SESSION_RATE_LIMIT_MAX=20
PUBLISH_RATE_LIMIT_MAX=30
DEMO_USER_EMAIL=
DEMO_USER_NAME=OneFlow Developer
DEMO_USER_PASSWORD=
```

服务启动时会校验环境变量。`ENCRYPTION_KEY` 和 `SESSION_SECRET` 少于 32 字符会直接
停止；生产环境的 `CORS_ORIGIN` 禁止 `*`。`.env` 不提交到 Git，
`server/.env.example` 只包含占位值。

## SQLite 位置

默认运行时数据库位于 `server/dev.db`。后端测试为每个测试文件创建独立的临时
SQLite 数据库，测试后删除；这些文件均被 `.gitignore` 排除。

Seed 可重复执行。只有同时配置 `DEMO_USER_EMAIL` 与 `DEMO_USER_PASSWORD` 时才会
生成可登录的本地 demo 账号；密码明文不写入代码或数据库。

PostgreSQL 切换见 [PostgreSQL Migration](postgres-migration.md)。

## 测试

```powershell
npm test
npm run check
npm run security:scan
```

测试运行器会逐文件执行 Node 测试，避免 Windows 下 libSQL 多测试文件共享进程时的
原生资源退出问题。

## Docker

```powershell
Copy-Item .env.example .env
docker compose up --build
npm run dev:frontend
```

Compose 启动后端与持久化 SQLite volume。完整边界见
[Deployment Notes](deployment-notes.md)。

## API 文档

- `GET http://127.0.0.1:4174/api/health`
- `GET http://127.0.0.1:4174/api/openapi.json`
- [统一错误格式](api-error-format.md)

## 当前限制

- Dev Session 和真实账号 Session 均持久化在数据库中；Dev Session 仍只允许开发环境。
- SQLite 适合单机开发，不提供生产级并发、备份和高可用。
- Mock 与 Halo Worker 都在 API 进程内同步执行，没有 Durable Queue。
- 目前仅 Halo 是真实平台链路；其他第三方渠道仍未接真实 API。
- 生产环境应迁移 PostgreSQL、KMS、独立 Worker，并补齐邮箱验证、MFA 与 CSRF。
