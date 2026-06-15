# Server Token Security

更新日期：2026-06-15

## Phase 4 边界

`ChannelConfig` 不保存明文平台 Token。API 只接收一次性 `credential` 字段，后端
使用 `ENCRYPTION_KEY` 加密后写入 `encryptedCredential`，响应仅返回：

```text
credentialStatus
connectionStatus
credentialStorage = server_managed
```

API 永远不返回明文或密文。

## 本地加密实现

当前 `credentialService` 使用 AES-256-GCM：

- 每次加密生成随机 IV。
- GCM authentication tag 用于检测密文篡改。
- 本地 `ENCRYPTION_KEY` 经 SHA-256 派生为固定长度密钥。
- 存储格式包含版本、IV、tag 和 ciphertext。

这是本地 SaaS MVP 的安全基础，不等同于生产密钥管理。

## 生产要求

- 使用 KMS 或 Secret Manager 管理主密钥。
- 使用 envelope encryption，并记录 `keyVersion`。
- 支持密钥轮换、凭据撤销和重新授权。
- 只有 Publisher Worker 的最小权限身份可以按任务解密。
- 解密值只存在于短生命周期内存，不写日志、错误、任务结果或追踪属性。
- 管理端只展示凭据状态，不提供“查看原文”。
- 记录连接、测试、轮换和发布操作的审计事件。

## 禁止项

- 不把 Token 写入前端 bundle、`localStorage`、截图或测试快照。
- 不提交 `.env`、数据库文件或浏览器 profile。
- 不在错误响应中返回 Authorization Header、Cookie 或第三方原始响应头。
- 不允许前端读取 `encryptedCredential`。

## 导入导出

浏览器工作区导出不包含服务端凭据。未来 SaaS 数据导出也只能包含连接状态和非敏感
配置；凭据迁移必须使用单独的受审计流程。
