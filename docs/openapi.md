# OpenAPI

更新日期：2026-06-15

后端在运行时通过以下地址提供可直接导入工具的原始 OpenAPI 3.1 JSON：

```text
http://127.0.0.1:4174/api/openapi.json
```

文档覆盖 Auth、Workspace、Article、Channel、Publish 和 Usage API，并引用统一成功/失败响应信封。该文档端点是唯一不包裹业务响应信封的 API 路径。当前未内置 Swagger UI，避免为本地 MVP 增加额外运行时依赖；可将该 JSON 导入支持 OpenAPI 的客户端查看。

健康检查地址：

```text
http://127.0.0.1:4174/api/health
```
