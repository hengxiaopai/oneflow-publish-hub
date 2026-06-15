# Development Workflow

更新日期：2026-06-15

## 首次初始化

```powershell
Copy-Item server/.env.example server/.env
npm --prefix server install
npm run db:generate
npm run db:migrate
npm run db:seed
```

`server/.env` 只用于本机且被 Git 忽略。请把示例密钥替换为两个不同的、至少 32 字符的随机值。

## 日常启动

```powershell
npm run dev
```

该命令同时启动：

- 前端：`http://127.0.0.1:4173`
- API：`http://127.0.0.1:4174`

也可分别运行 `npm run dev:frontend` 和 `npm run dev:server`。后端未启动时，Local Demo Mode 仍可用；SaaS Dev Mode 会显示明确的连接失败状态。

## 数据库命令

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:reset
```

Seed 使用固定开发标识执行 upsert，可重复运行，不会重复创建开发用户、默认工作区、Free 订阅、示例文章、渠道或 AI 能力。

## 提交前验证

```powershell
npm test
npm run check
npm run security:scan
```

后端测试为每个测试文件创建独立 SQLite 数据库，避免 Windows 下并发共享 libSQL 原生资源导致随机退出。

## API 契约

- 健康检查：`GET /api/health`
- OpenAPI JSON：`GET /api/openapi.json`
- 响应约定：[API Error Format](api-error-format.md)
- 接口草案：[Backend API Design](backend-api-design.md)
