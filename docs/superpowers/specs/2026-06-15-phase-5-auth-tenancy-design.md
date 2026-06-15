# Phase 5 SaaS Authentication And Tenancy Design

更新日期：2026-06-15

## 目标

将 OneFlow 从仅支持内存 dev session 的 SaaS MVP，升级为支持密码注册、持久 Cookie Session、Workspace 多租户隔离和最小 RBAC 的 SaaS 基础。现有 Local Demo、SaaS Dev Mode、Vanilla JS 工作台、Mock Worker 与 SQLite 测试链路保持可用。

## 方案选择

### 认证

- 密码使用 Argon2id 保存，不保存或记录明文。
- 浏览器认证使用随机 Session token；数据库只保存 SHA-256 token hash。
- token 通过 `oneflow_session` Cookie 传输，设置 `httpOnly`、`SameSite=Lax`、`Path=/`，生产环境设置 `Secure=true`。
- `POST /api/auth/register` 创建 User、password AuthIdentity、默认 Workspace、owner Membership、Free Subscription 与 Session。
- `POST /api/auth/login` 使用统一错误 `INVALID_CREDENTIALS`，不区分邮箱不存在和密码错误。
- `GET /api/auth/me` 返回安全 User、currentWorkspace、role 与 subscription，不返回 passwordHash、tokenHash 或 Session token。
- `POST /api/auth/logout` 删除持久 Session 并清除 Cookie。

### Dev Session

- `/api/dev/session` 继续通过 `x-oneflow-dev-session` header 支持现有前端。
- dev token 也写入 Session 表，避免服务重启后无依据的内存状态。
- 生产环境返回 `404 DEV_ONLY_DISABLED`。
- Cookie Session 优先于 dev header；两种认证最终生成同一 `request.auth` 结构。

### Workspace 与 RBAC

- Session 固定当前 `workspaceId`，认证中间件每次请求查询 Session、User、WorkspaceMember 与 Workspace。
- Session 有效但 Membership 被移除时返回 `403 WORKSPACE_ACCESS_DENIED`。
- 所有业务查询继续显式包含 `workspaceId`。
- `owner/admin/editor/viewer` 权限：
  - member：读取。
  - editor：创建、编辑、删除文章；创建发布批次。
  - admin：editor 权限 + 创建、修改、测试渠道。
  - owner：全部权限。
- RBAC 由 `rbacService.js` 统一判断，路由不自行散落角色数组。

### Entitlement

- `Workspace.plan` 是实时授权来源，Subscription 保留账单状态与周期信息。
- Free、Pro、Studio 使用现有配额表。
- 所有额度拒绝统一返回 `ENTITLEMENT_LIMIT_EXCEEDED`，`details` 包含具体 capability、limit、used 与原始 reason。

### SQLite 与 PostgreSQL

Prisma datasource provider 是 schema 编译期属性，不能由普通环境变量在单个 schema 中动态切换。因此：

- `server/prisma/schema.prisma` 继续使用 SQLite，服务本地开发和自动测试。
- `server/prisma/schema.postgresql.prisma` 使用 PostgreSQL provider，并保持完全相同的模型与关系。
- 两个 schema 只使用两种数据库都支持的标量、索引和关系，不引入 SQLite 专属 SQL。
- PostgreSQL 通过独立 generate/validate/migrate 命令启用；生产推荐 PostgreSQL。

## 前端

- 登录页保留 Local Demo 和 SaaS Dev Mode。
- 原 SaaS 云端占位升级为 SaaS Auth Mode，包含登录/注册切换、邮箱、密码、昵称和错误状态。
- API client 对 Cookie Auth 使用 `credentials: "include"`，不读取 Cookie，不在 Web Storage 保存密码或真实 Session token。
- 页面加载时若模式为 `saas_auth`，调用 `/api/auth/me` 恢复登录。
- 退出真实认证调用 `/api/auth/logout` 后回到 `#/login`。
- 工作台数据复用现有 SaaS API 加载逻辑，不重写业务页面。

## 安全边界

- 密码最小 10 字符，邮箱规范化为小写。
- register/login 使用更严格 rate limit。
- 日志脱敏增加 password、passwordHash、tokenHash、set-cookie。
- Cookie Session 默认 7 天，过期 Session 查询时删除。
- API view model 明确列字段，禁止直接展开 User/Session。
- OAuth 只保留 AuthIdentity 模型，不实现 provider callback。

## 测试

- Auth：注册、重复邮箱、密码 hash、登录 Cookie、统一失败、me、logout。
- Session：持久 token hash、过期、无敏感字段、生产禁用 dev session。
- 租户：跨 Workspace 文章、渠道、批次、任务与 AI 能力访问失败。
- RBAC：viewer 只读、editor 内容与发布、admin 渠道管理。
- Entitlement：Workspace.plan 驱动 Free/Pro/Studio，统一错误码。
- 前端：Cookie credentials、Auth Mode 表单、恢复登录态与退出。
- 浏览器：Local、Dev、Auth 注册登录刷新退出，1440/820 无溢出和正常流程 0 console error/warning。

## 非目标

- OAuth、找回密码、邮箱验证、MFA。
- 支付、真实发布器、真实 AI Provider。
- Workspace 切换 UI、邀请成员 UI、生产队列。
