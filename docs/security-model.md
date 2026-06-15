# Security Model

更新日期：2026-06-15

## 账号与 Session

- 密码使用 Argon2id，明文不落库、不进日志。
- Session 原始 token 只存在于 httpOnly Cookie，数据库只保存 HMAC hash。
- Cookie 使用 `SameSite=Lax`；生产环境 `Secure=true`。
- Session 每次请求重新校验 WorkspaceMember，成员移除后立即失效。
- 登录与注册应用独立 rate limit，错误不暴露邮箱是否存在。
- `password`、Cookie、Session、Token 与 credential 路径全部进入日志脱敏列表。

## Token 加密保存

- 平台 Token、PAT、Refresh Token 和 Provider API Key 不进入前端长期存储。
- 服务端使用 envelope encryption：数据密钥加密凭据，主密钥由 KMS 管理。
- 数据库存储密文、nonce、算法、密钥版本和轮换时间。
- Worker 只在执行任务时解密，完成后释放明文。
- API 只返回 `connected`、`expired`、`reauthorize` 等状态。

## API Key 不进前端

- AI Provider、Billing、对象存储和第三方平台密钥只存在 Secret Manager。
- 浏览器 Bundle、HTML、localStorage、日志、截图、测试快照和导出包不得包含密钥。
- 前端不得使用 `no-cors` 或其他方式绕过浏览器安全策略。

## 工作区数据隔离

- 所有租户业务记录包含 `workspaceId`。
- 后端从 Session 和 WorkspaceMember 推导可访问 Workspace。
- 不信任客户端提交的成员关系、Role 或 Billing 状态。
- 数据库查询、对象存储路径、队列任务和缓存键都包含 Workspace 作用域。

## 用户权限

建议基础 Role：

- `owner`：账单、删除 Workspace、成员和所有内容权限。
- `admin`：成员、渠道和内容管理，不可转移所有权。
- `editor`：内容编辑、AI 适配和发布。
- `viewer`：只读内容、任务和数据回流。

高风险操作必须重新校验权限，不能只依赖页面是否显示按钮。

## 发布任务审计

AuditEvent 至少记录：

- actorUserId、workspaceId、action、resourceType、resourceId。
- 创建批次、确认版本、连接渠道、重试、取消和权限变更。
- 请求时间、任务 ID、结果、错误码和客户端信息。
- 不记录 Authorization Header、Cookie 或凭据正文。

## XSS 防护

- 前端编辑时执行白名单 sanitizer。
- 后端接收和发布前再次执行独立 sanitizer。
- 输出到 UI 时按上下文转义。
- Content Security Policy 禁止任意脚本和不受控资源域。
- 富文本图片与链接协议使用 allowlist。

## CSRF / CORS 边界

- Cookie Session 使用 `Secure`、`HttpOnly`、`SameSite=Lax/Strict`。
- 状态变更请求使用 CSRF Token 或同源双重校验。
- CORS 只允许 OneFlow 正式域名和明确的开发域名。
- 第三方平台 CORS 不属于正式发布依赖，因为 Worker 在服务端调用。

## 日志脱敏

禁止写入日志：

- Authorization、Cookie、Set-Cookie。
- Token、密码、支付敏感数据。
- 完整第三方响应和用户导入包。
- 未经处理的文章正文或私密草稿。

错误日志使用 allowlist 字段和稳定错误码。

## 导入导出安全

- 导入文件限制大小、schema 版本、字段深度和集合数量。
- 导入 HTML 前后端双重过滤。
- 拒绝原型污染键和不可识别资源引用。
- 默认导出不包含平台凭据、Session、Billing 密钥和 Provider 配置。
- 导出动作记录审计并使用短时签名下载地址。

## 公开仓库安全要求

- `.env`、浏览器 Profile、认证缓存、测试凭据和导出数据必须忽略。
- 示例值使用明确占位符，不使用真实 Token 格式。
- 提交前运行 secret scan、`git ls-files` 和 staged diff 检查。
- 截图不得出现真实账号、邮箱、Token、Cookie、账单或用户内容。
- 安全问题应通过私密渠道报告，不在公开 Issue 粘贴凭据。

## 本地开发模式

本地开发模式可以保留 MockPublisher。若未来保留 Halo 浏览器直连实验，必须：

- 默认关闭。
- 仅用于用户明确控制的本地环境。
- 不进入 SaaS 主流程。
- 清楚提示 Token 暴露和 CORS 风险。
- 不允许凭据进入导出、日志、截图或测试快照。
