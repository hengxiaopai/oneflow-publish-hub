# Halo Integration Boundary

更新日期：2026-06-14

## 当前结论

提交 `c89aa06` 记录了 Phase 3 的 Halo 浏览器直连设计，用于验证 Halo 2.x
Console API、PostRequest 映射和本地发布体验。

产品定位升级为公开 SaaS 后，该方案已被 Phase 3S 的服务端发布器设计取代。

## 正式 SaaS 方案

- 用户在渠道设置中发起 Halo 连接。
- PAT 通过受保护请求发送到后端一次。
- 后端加密保存 PAT，之后只向前端返回连接状态。
- 前端创建 PublishBatch。
- 后端创建 PublishTask 并写入队列。
- HaloPublisher Worker 解密 PAT 并调用 Halo。
- 任务结果和远程 URL 回写数据库。

## 本地开发方案

- MockPublisher 是默认发布器。
- 浏览器直连 Halo 可以保留为显式开启的本地实验。
- 本地实验不能成为 SaaS 主流程，不能把 Token 写入 Git、导出包、日志或截图。
- CORS 失败只说明浏览器不能直连，不影响正式服务端发布方案。

## 官方资料

- [Halo REST API introduction](https://docs.halo.run/developer-guide/restful-api/introduction)
- [Halo generated Python client](https://github.com/halo-dev/python_client)
- [PostV1alpha1ConsoleApi](https://github.com/halo-dev/python_client/blob/main/docs/PostV1alpha1ConsoleApi.md)
