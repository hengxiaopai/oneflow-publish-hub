# OpenAPI

更新日期：2026-06-15

后端在运行时通过以下地址提供可直接导入工具的原始 OpenAPI 3.1 JSON：

```text
http://127.0.0.1:4174/api/openapi.json
```

文档覆盖密码 Auth、开发 Session、Workspace、Article、Channel、Publish、Usage 和
AI Capability API，并描述 Cookie Session 与开发 Header 两种安全方案。该文档端点
是唯一不包裹业务响应信封的 API 路径。当前未内置 Swagger UI；可将 JSON 导入支持
OpenAPI 的客户端查看。

健康检查地址：

```text
http://127.0.0.1:4174/api/health
```
