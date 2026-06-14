# OneFlow Publish Hub

一个使用原生 HTML、CSS 和 Vanilla JavaScript 构建的本地优先“一文多发”
内容工作台 MVP。

## 产品结构

- 顶部：悬浮式 Liquid Glass 主导航。
- 状态轨道：Analyze → Adapt → Review → Authorize → Publish → Feedback。
- 左侧：工作区、内容资产、草稿和平台账号。
- 中间：占据主要空间的实体纸面文章编辑器。
- 右侧：按真实发布状态分组的平台队列。
- 底部：固定批量发布控制条。

队列覆盖 14 个渠道，并区分自动发布、生成草稿、复制发布、人工确认、
内容再加工、重新授权和失败重试。

## 运行

直接打开 `index.html`，或在项目目录启动任意静态文件服务器：

```powershell
python -m http.server 4173
```

然后访问 `http://localhost:4173`。

## 交互

- 编辑文章标题、摘要、正文、标签和封面说明，实时更新字数与阅读时间。
- 自动保存 Article、平台版本、发布任务、发布批次和工作区设置。
- 主文章变化后，平台版本会标记为需要重新适配。
- 平台版本重新适配并确认后，才可进入发布批次。
- 选择或取消渠道，底部发布数量与预计耗时会同步更新。
- 使用“全部 / 已选择 / 需处理”筛选发布队列。
- 对草稿执行确认，对异常渠道执行授权或重试。
- 查看主文章或平台版本预览。
- 设置立即/定时发布、发布策略和发布后动作。
- 平板宽度下，工作区与发布队列会切换为抽屉。
- 发布记录页可查看本地批次详情，并复用渠道创建新批次。
- 发布记录使用不可变文章与平台版本快照，后续编辑不会改写历史。
- 内容库可查看当前草稿和已发布快照，并打开或复制为新文章。
- 工作区支持 JSON 导入、导出和显式重置。
- 队列支持舒适与紧凑两种密度。
- 侧栏“重置”可恢复演示数据。

## 本地持久化

Phase 2.5 使用版本化 `localStorage` 快照，键为
`oneflow.workspace.v3`，兼容迁移 v1/v2。正文经过最小 HTML 白名单过滤；
不保存平台令牌、Cookie、图片或视频二进制数据。

详见：

- `docs/local-persistence.md`
- `docs/publish-batch-flow.md`
- `docs/storage-migration.md`
- `docs/html-sanitization.md`

## 可访问性

- 支持键盘焦点和语义化状态。
- 支持 `prefers-reduced-motion`。
- 支持 `prefers-reduced-transparency`，并为不支持模糊的浏览器提供实体背景。
- 支持 `prefers-contrast: more`。

## Liquid Glass 约束

玻璃材质只用于导航、状态轨道、发布队列容器、浮层和底部控制条。文章正文
使用稳定的暖白实体表面，不使用满屏模糊或 glass on glass。

本项目参考 Apple 对内容层、导航与控制层的公开设计说明，但 Web 实现和 token
属于项目内设计约束，不代表 Apple 官方 Web 规范：

- [Apple Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple Human Interface Guidelines: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple WWDC25: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Apple WWDC25: Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/)
- [Apple: Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)

完整设计规则位于：

`skills/liquid-glass-product-ui/SKILL.md`

平台能力和产品路线：

- `docs/platform-capability-matrix.md`
- `docs/product-data-model.md`
- `docs/local-persistence.md`
- `docs/publish-batch-flow.md`
- `docs/product-roadmap.md`
- `docs/ai-slop-audit.md`

## 素材

`assets/article-cover.png` 为本项目生成的原创文章封面，不依赖外部付费素材。

## 验证

```powershell
node --test tests/*.test.js
python "$env:CODEX_HOME\skills\.system\skill-creator\scripts\quick_validate.py" skills\liquid-glass-product-ui
```
