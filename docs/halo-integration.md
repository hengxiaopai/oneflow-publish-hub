# Halo Server-side Integration

更新日期：2026-06-15

## Phase 6 状态

OneFlow 已实现第一条真实平台发布链路：自建 Blog / Halo。正式流程是：

```text
前端创建 PublishBatch
  -> 后端生成 PublishTask 与不可变快照
  -> Publisher Router 选择 Halo Worker
  -> Worker 临时解密 PAT
  -> 创建 Halo 草稿
  -> 可选发布草稿
  -> 回写远程 ID、URL、状态和耗时
```

浏览器不直接调用 Halo，也不会读取已保存 PAT。

## Halo 2.25 接口

当前实现基于 Halo 官方资料确认的 Console API：

- PAT：`Authorization: Bearer <PAT>`
- 连接测试：`GET /apis/api.console.halo.run/v1alpha1/posts?page=0&size=1`
- 创建草稿：`POST /apis/api.console.halo.run/v1alpha1/posts`
- 发布草稿：`PUT /apis/api.console.halo.run/v1alpha1/posts/{name}/publish`
- 草稿载荷：`PostRequest { post, content }`

`baseUrl` 与 `consoleApiEndpoint` 均可配置。默认 endpoint 为
`/apis/api.console.halo.run/v1alpha1`。

官方资料：

- [Halo 2.25 RESTful API introduction](https://docs.halo.run/developer-guide/restful-api/introduction)
- [Halo RESTful API index](https://api.halo.run/)
- [Halo generated PostRequest model](https://github.com/halo-dev/python_client/blob/main/docs/PostRequest.md)
- [Halo generated PostSpec model](https://github.com/halo-dev/python_client/blob/main/docs/PostSpec.md)
- [Halo Console Post API](https://github.com/halo-dev/python_client/blob/main/docs/PostV1alpha1ConsoleApi.md)

## PostRequest 映射

OneFlow 将 ArticleSnapshot 与 ChannelVersionSnapshot 集中映射为：

```json
{
  "post": {
    "apiVersion": "content.halo.run/v1alpha1",
    "kind": "Post",
    "metadata": {
      "name": "",
      "generateName": "post-"
    },
    "spec": {
      "title": "平台标题",
      "slug": "editable-slug",
      "excerpt": { "autoGenerate": false, "raw": "平台摘要" },
      "cover": "https://...",
      "tags": ["tag-metadata-name"],
      "categories": ["category-metadata-name"],
      "visible": "PUBLIC",
      "publish": false,
      "allowComment": true
    }
  },
  "content": {
    "raw": "Markdown source",
    "content": "<p>sanitized HTML</p>",
    "rawType": "MARKDOWN"
  }
}
```

分类、标签和作者需要填写 Halo 对应资源的 `metadata.name`，不是仅供展示的名称。
不同 Halo 小版本或插件可能扩展字段，映射统一维护在
`server/src/services/publishers/haloPublisherService.js`。

## 错误映射

| Halo / 网络状态 | OneFlow 错误码 |
|---|---|
| 401 / 403 | `HALO_AUTH_FAILED` |
| 404 | `HALO_ENDPOINT_NOT_FOUND` |
| 409 | `HALO_SLUG_CONFLICT` |
| 400 / 422 | `HALO_PAYLOAD_INVALID` |
| Timeout | `HALO_TIMEOUT` |
| Connection refused | `HALO_UNREACHABLE` |
| Network failure | `HALO_NETWORK_ERROR` |

错误响应与任务结果不保存 Authorization Header、PAT 或原始响应头。

## 过渡方案

提交 `c89aa06` 的浏览器直连方案是 Phase 3 本地验证产物，已被本服务端链路取代。
相关代码可保留用于历史参考，但不是 SaaS 正式方案，也不依赖 CORS。
