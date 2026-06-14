# Public Release Checklist

检查日期：2026-06-14

目标仓库：`hengxiaopai/oneflow-publish-hub`

## 安全检查

| 检查项 | 结果 | 说明 |
|---|---|---|
| 是否包含敏感信息 | 通过 | 当前树与 Git 历史未发现凭证或个人敏感配置 |
| 是否包含真实 API Key | 通过 | 未发现 GitHub Token、API Key、OAuth secret 或私钥模式 |
| 是否包含账号密码 | 通过 | 未发现账号密码、Cookie 或真实平台账号凭证 |
| 是否包含真实用户数据 | 通过 | UI 中的姓名、文章和平台状态均为原型演示数据 |
| 是否包含本机隐私路径 | 通过 | 旧 README 绝对路径已改为基于 `CODEX_HOME` 的可移植命令，并重写历史 |
| 是否包含环境文件 | 通过 | 未跟踪 `.env` / `.env.*`，并由 `.gitignore` 排除 |
| 是否包含浏览器 Profile | 通过 | 未跟踪浏览器 Profile、Playwright 缓存或认证目录 |
| 是否包含依赖和构建产物 | 通过 | 未跟踪 `node_modules`、`dist`、`build`、测试报告或 coverage |

## 仓库质量

| 检查项 | 结果 | 说明 |
|---|---|---|
| 是否包含大文件 | 通过 | 跟踪内容约 6 MiB，无单个文件超过 5 MiB；最大文件为原创封面 |
| README 是否完整 | 通过 | 包含定位、阶段、能力、技术栈、运行、限制、路线图和安全说明 |
| LICENSE 是否存在 | 通过 | 使用 MIT License |
| 自动测试是否通过 | 通过 | Node built-in test runner 全部通过 |
| JS 语法检查是否通过 | 通过 | `app.js`、`storage.js`、`sanitizer.js` 均通过 |
| Liquid Glass Skill 是否有效 | 通过 | Skill 校验器返回 `Skill is valid!` |
| 控制台是否干净 | 通过 | 本地浏览器验收为 0 error / 0 warning |
| 截图路径是否有效 | 通过 | README 桌面截图与 `docs/screenshots/` 验收图片均存在 |

## 公开边界

- 当前实现是本地 MVP，不会真实发布到第三方平台。
- 平台能力矩阵中的“待验证”或“半自动”不代表平台官方承诺。
- 仓库不应接收包含生产 Token、Cookie、密码或真实用户工作区数据的提交。
- 未来接入后端时，密钥必须放在服务端 Secret 管理系统中，不得进入前端仓库。
