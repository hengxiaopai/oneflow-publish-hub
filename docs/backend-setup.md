# Phase 4 Backend Setup

更新日期：2026-06-15

## 定位

Phase 4 后端是 OneFlow 的最小 SaaS 开发服务。它提供 Fastify API、Prisma
数据模型、SQLite、本地 dev session、服务端 Entitlement、凭据加密字段和
Mock Publisher Worker。它不是生产认证或真实平台发布服务。

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

打开 `http://127.0.0.1:4173/#/login`，选择：

- `Local Demo Mode`：继续使用 `localStorage`，后端未启动也可用。
- `SaaS Dev Mode`：调用 `/api/dev/session`，文章、渠道、用量和发布批次使用后端。

## 环境变量

```text
PORT=4174
HOST=127.0.0.1
DATABASE_URL=file:./dev.db
ENCRYPTION_KEY=replace-with-a-long-random-local-key
SESSION_SECRET=replace-with-a-different-long-random-session-secret
CORS_ORIGIN=http://127.0.0.1:4173
BODY_LIMIT=3145728
DEV_SESSION_RATE_LIMIT_MAX=20
PUBLISH_RATE_LIMIT_MAX=30
```

服务启动时会校验环境变量。`ENCRYPTION_KEY` 和 `SESSION_SECRET` 少于 32 字符会直接
停止；生产环境的 `CORS_ORIGIN` 禁止 `*`。`.env` 不提交到 Git，
`server/.env.example` 只包含占位值。

## SQLite 位置

默认运行时数据库位于 `server/dev.db`。后端测试为每个测试文件创建独立的临时
SQLite 数据库，测试后删除；这些文件均被 `.gitignore` 排除。

Seed 可重复执行，固定开发记录使用 upsert，不会生成重复用户、工作区、订阅、文章、
渠道或 AI 能力。

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

- Dev session 仅保存在后端内存中，重启服务后失效。
- SQLite 适合单机开发，不提供生产级并发、备份和高可用。
- Mock Worker 在 API 进程内同步执行，没有 Durable Queue。
- 未接 OAuth、邮件、支付、对象存储或真实平台 API。
- 生产环境应迁移 PostgreSQL、持久 Session、KMS 和独立 Worker。
