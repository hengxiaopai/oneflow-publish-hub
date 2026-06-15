# URL Safety And SSRF

更新日期：2026-06-15

Halo Base URL 是用户输入，服务端请求前必须防止其被用于访问 OneFlow 所在网络的内部资源。

## 默认规则

`server/src/services/urlSafetyService.js` 在连接保存、连接测试和发布请求前检查：

- 仅允许 `http:` 与 `https:`。
- 生产环境只允许 HTTPS。
- 禁止 URL 用户名和密码。
- 禁止 localhost、metadata 主机和云元数据地址。
- 禁止回环、未指定、链路本地、CGNAT 和常见私网 IPv4。
- 禁止 IPv6 loopback、unique-local 与 link-local。
- 域名解析到私网地址时拒绝，降低 DNS rebinding 风险。

拒绝时统一返回 `UNSAFE_REMOTE_URL`，且不会保存渠道配置或发起 Halo API 请求。

## 开发例外

仅非生产环境可通过以下变量允许私有 Halo：

```text
ALLOW_PRIVATE_HALO_URLS=true
```

此开关用于本机或局域网开发，不应写入生产配置。即使开启，`file:`、`gopher:`、`ftp:` 等非 HTTP(S) scheme 仍会拒绝。

## 仍需部署层防线

应用层 URL 校验不是唯一边界。生产环境还应：

- 将 Publisher Worker 放入限制出站网络的子网。
- 通过 egress proxy 或防火墙维护允许列表。
- 禁止访问云元数据服务。
- 对重定向后的每个目标重新校验。
- 将 Halo 请求与主 API 进程隔离。
