# OneFlow 一文多发

OneFlow 是面向 AI 内容创作者的“一文多发发布中枢”。它将文章编辑、AI
分析、多平台适配、人工确认、授权检查、批量发布和数据回流组织在同一工作台中。

当前阶段为 **Phase 2.5，本地 MVP**。项目不连接真实第三方平台，也不包含任何
真实平台 API Token、Cookie 或账号凭证。

![OneFlow 桌面工作台](docs/screenshots/phase-2-5-desktop-1440.png)

## 核心能力

- 克制的 Apple Liquid Glass 风格高保真 UI。
- 高可读性的本地文章编辑器，支持标题、摘要、正文、标签和封面说明。
- 14 个内容平台的版本状态、授权、适配进度和发布方式管理。
- 基于 `localStorage` 的本地持久化和 v1/v2 → v3 数据迁移。
- 发布批次、文章和渠道版本的不可变快照。
- 基础 HTML sanitizer，过滤危险标签、事件属性和 `javascript:` 链接。
- 工作区 JSON 导入、导出、损坏数据备份和演示数据重置。
- 发布记录与批次任务详情。
- 当前草稿与已发布快照组成的内容库。
- 桌面端优先、兼容平板的响应式布局。
- Reduced Motion、Reduced Transparency 和高对比度降级。

## 产品工作流

```text
写文章
  → Analyze 内容分析
  → Adapt 多平台适配
  → Review 人工确认
  → Authorize 授权检查
  → Publish 批量发布
  → Feedback 数据回流
```

平台能力采用保守建模：

- 自建 Blog 作为自动发布示例。
- 第三方文章平台以生成草稿、复制发布和人工确认流程为主。
- 抖音、小红书、哔哩哔哩进入标题、封面、脚本、话题和简介等内容再加工流程。
- 未验证的平台能力明确标记为“待验证”或“半自动”。

## 技术栈

- HTML
- CSS
- Vanilla JavaScript
- `localStorage`
- Node.js built-in test runner

项目不依赖后端、前端框架或外部付费素材。

## 本地运行

需要 Python 3 或任意静态文件服务器：

```powershell
git clone https://github.com/hengxiaopai/oneflow-publish-hub.git
cd oneflow-publish-hub
python -m http.server 4173
```

浏览器访问：

```text
http://127.0.0.1:4173/
```

也可以直接打开 `index.html`，但使用本地服务器能获得更一致的浏览器行为。

## 测试

需要 Node.js 20 或更高版本：

```powershell
node --test tests/*.test.js
node --check app.js
node --check storage.js
node --check sanitizer.js
```

如果本机安装了 Codex Skill Creator，可额外验证 Liquid Glass Skill：

```powershell
python "$env:CODEX_HOME\skills\.system\skill-creator\scripts\quick_validate.py" skills\liquid-glass-product-ui
```

## 数据与安全

- 工作区数据仅保存在当前浏览器的 `localStorage` 中。
- 当前 schema key 为 `oneflow.workspace.v3`，兼容迁移 v1 和 v2。
- 正文会在编辑、恢复、导入和生成发布快照时执行白名单过滤。
- 导入工作区前会显示覆盖确认，不会静默替换本地数据。
- 数据损坏时保留原始内容，允许导出备份或显式重置。
- 仓库不包含真实第三方平台 API Token、Cookie、密码或用户数据。
- 不应将生产密钥写入前端代码、localStorage 或导出的工作区 JSON。

安全与存储说明：

- [HTML Sanitization](docs/html-sanitization.md)
- [Storage Migration](docs/storage-migration.md)
- [Local Persistence](docs/local-persistence.md)
- [Public Release Checklist](docs/public-release-checklist.md)

## 当前限制

- 所有发布结果均为本地模拟，不会向第三方平台发送内容。
- 第三方平台能力会变化，矩阵中的“待验证”不代表官方承诺。
- `localStorage` 容量有限，不适合图片、视频或大规模版本历史。
- 多标签页同时编辑采用最后写入覆盖，尚无冲突合并。
- sanitizer 是本地 MVP 的最小防线，接入后端后仍需服务端再次过滤。
- 当前没有用户系统、云端同步、真实 OAuth、平台 API 或数据分析后端。

## Roadmap

- **Phase 1**：前端高保真原型。
- **Phase 2**：本地草稿与发布记录持久化。
- **Phase 2.5**：不可变快照、HTML 安全过滤、数据迁移与导入导出。
- **Phase 3**：打通自建 Blog / Halo 发布。
- **Phase 4**：第三方平台半自动适配与复制发布。
- **Phase 5**：浏览器自动化或 API 发布器实验。
- **Phase 6**：数据回流与复盘分析。

完整路线见 [docs/product-roadmap.md](docs/product-roadmap.md)。

## 设计约束

玻璃材质只用于导航、状态、控制和浮层。文章正文保持暖白实体纸面，不使用
满屏模糊、glass on glass、无意义 3D blob 或廉价霓虹效果。

参考资料：

- [Apple Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple Human Interface Guidelines: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple WWDC25: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Apple: Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)

项目内设计规则位于
[skills/liquid-glass-product-ui/SKILL.md](skills/liquid-glass-product-ui/SKILL.md)。

## 文档

- [平台能力矩阵](docs/platform-capability-matrix.md)
- [产品数据模型](docs/product-data-model.md)
- [发布批次流程](docs/publish-batch-flow.md)
- [产品路线图](docs/product-roadmap.md)
- [AI Slop Audit](docs/ai-slop-audit.md)

## License

[MIT](LICENSE)
