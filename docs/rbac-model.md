# RBAC Model

更新日期：2026-06-15

权限判断集中在 `server/src/services/rbacService.js`，角色从低到高为：

| Role | 读取 | 文章编辑/删除 | 创建发布批次/重试 | 渠道管理 |
| --- | --- | --- | --- | --- |
| viewer | 是 | 否 | 否 | 否 |
| editor | 是 | 是 | 是 | 否 |
| admin | 是 | 是 | 是 | 是 |
| owner | 是 | 是 | 是 | 是 |

受保护路由先执行 Session 与 Membership 检查，再执行最小角色检查。权限不足统一返回
`ROLE_PERMISSION_DENIED`，响应包含 `requiredRole` 和 `currentRole`，不包含凭据。

前端隐藏按钮只能改善体验，不能代替服务端 RBAC。后续成员邀请、角色修改、账单与
Workspace 删除应分别增加 owner/admin 级别的细粒度能力。
