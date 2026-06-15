# API Response And Error Format

更新日期：2026-06-15

Phase 4.1 起，OneFlow API 使用统一响应信封。前端 `api-client.js` 会校验该协议，避免把代理页、HTML 错误页或旧接口响应误当成业务数据。

## 成功响应

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "requestId": "req-..."
  }
}
```

删除、退出登录等无返回实体的操作使用 `data: null`，仍返回 JSON 信封。

## 失败响应

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求字段不符合接口要求。",
    "details": {
      "requestId": "req-..."
    }
  }
}
```

生产环境的 `500` 响应不会包含堆栈、SQL、文件路径或凭据。服务端日志保留 requestId 便于定位，同时对 authorization、cookie、token、credential、secret 等字段脱敏。

## 主要错误码

| code | HTTP | 含义 |
| --- | ---: | --- |
| `VALIDATION_ERROR` | 400 | 请求字段或格式无效 |
| `JSON_BODY_REQUIRED` | 415 | 写操作未使用 JSON |
| `UNAUTHENTICATED` | 401 | 缺少或无效 dev session |
| `FORBIDDEN` | 403 | 当前工作区角色无权限 |
| `NOT_FOUND` | 404 | 路由或工作区资源不存在 |
| `CONFLICT` | 409 | 唯一键或版本冲突 |
| `BODY_TOO_LARGE` | 413 | 请求体超过限制 |
| `RATE_LIMITED` | 429 | dev session 或发布接口调用过快 |
| `PLAN_UPGRADE_REQUIRED` | 403 | 当前套餐不包含能力 |
| `USAGE_LIMIT_REACHED` | 403 | 当前周期额度耗尽 |
| `INTERNAL_ERROR` | 500 | 未公开内部细节的服务端异常 |

## 前端错误分类

`/api/openapi.json` 为了可被标准工具直接导入，返回原始 OpenAPI JSON；其余业务 API 使用上述信封。

`api-client.js` 额外产生以下本地错误：

- `BACKEND_UNAVAILABLE`：无法连接 `http://127.0.0.1:4174`。
- `REQUEST_TIMEOUT`：请求超过 10 秒。
- `API_PROTOCOL_ERROR`：响应不是 OneFlow 统一信封。

这些错误只影响 SaaS Dev Mode。Local Demo Mode 继续使用浏览器本地数据。
