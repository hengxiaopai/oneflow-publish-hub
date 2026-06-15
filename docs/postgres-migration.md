# PostgreSQL Migration

更新日期：2026-06-15

## Schema 策略

Prisma 的 datasource provider 在 schema 中静态声明，不能通过运行时环境变量在
`sqlite` 与 `postgresql` 间切换。因此 OneFlow 保留两份同构 schema：

- `server/prisma/schema.prisma`：SQLite，本地开发和自动测试。
- `server/prisma/schema.postgresql.prisma`：PostgreSQL，生产迁移基线。

两份 schema 都包含 Phase 5 的 User、Session、AuthIdentity、Workspace、RBAC、
发布快照与套餐模型。CI/`npm run check` 会同时校验二者。

## 本地 SQLite

```powershell
$env:DATABASE_URL="file:./dev.db"
npm run db:generate
npm run db:migrate
npm run db:seed
```

## PostgreSQL 准备

1. 创建独立 PostgreSQL 数据库和最小权限应用账号。
2. 设置 `POSTGRES_DATABASE_URL`，不要提交真实连接串。
3. 运行 `npm --prefix server run prisma:validate:postgres`。
4. 在隔离环境执行：

```powershell
cd server
npx prisma migrate dev --config prisma.postgresql.config.ts --name baseline
```

5. 审查 migration，用脱敏备份演练，再通过 `prisma migrate deploy` 发布。

## 数据迁移注意事项

- SQLite JSON 字段当前以字符串保存，迁移后先保持 `String`，避免同步改变 API。
- `ownerId` 对旧数据允许为空，SQLite migration 会从现有 Membership 回填。
- 生产切换前校验邮箱唯一性、Workspace slug、Membership 和过期 Session。
- 密码 hash 与 Session token hash 可迁移；系统不存在明文密码和原始 token。
- 切换数据库前停止写入或建立双写/增量同步，不能复制正在写入的 SQLite 文件。
