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
cd server
Copy-Item .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

另开终端启动前端：

```powershell
cd ..
python -m http.server 4173
```

打开 `http://127.0.0.1:4173/#/login`，选择：

- `Local Demo Mode`：继续使用 `localStorage`，后端未启动也可用。
- `SaaS Dev Mode`：调用 `/api/dev/session`，文章、渠道、用量和发布批次使用后端。

## 环境变量

```text
PORT=4174
HOST=127.0.0.1
DATABASE_URL=file:./dev.db
ENCRYPTION_KEY=replace-with-a-long-random-local-key
CORS_ORIGIN=http://127.0.0.1:4173
```

`.env` 不提交到 Git。`server/.env.example` 只包含占位值。

## SQLite 位置

默认运行时数据库位于 `server/dev.db`。测试数据库为 `server/test.db`，测试前会
重置；两者均被 `.gitignore` 排除。

## 测试

```powershell
cd server
npm test
npx prisma validate
```

测试运行器会逐文件执行 Node 测试，避免 Windows 下 libSQL 多测试文件共享进程时的
原生资源退出问题。

## 当前限制

- Dev session 仅保存在后端内存中，重启服务后失效。
- SQLite 适合单机开发，不提供生产级并发、备份和高可用。
- Mock Worker 在 API 进程内同步执行，没有 Durable Queue。
- 未接 OAuth、邮件、支付、对象存储或真实平台 API。
- 生产环境应迁移 PostgreSQL、持久 Session、KMS 和独立 Worker。
