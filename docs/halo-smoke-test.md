# Halo Smoke Test

更新日期：2026-06-15

`server/scripts/halo-smoke-test.js` 用于人工验收真实 Halo 2.x Console API。它默认只创建一篇私有测试草稿，不在 CI 中运行，也不会输出 PAT。

## 环境变量

```powershell
$env:HALO_TEST_BASE_URL="https://blog.example.com"
$env:HALO_TEST_ENDPOINT="/apis/api.console.halo.run/v1alpha1"
$env:HALO_TEST_PAT="<local-secret>"
$env:HALO_TEST_MODE="draft"
npm run test:halo-smoke
```

标题格式为 `OneFlow Smoke Test <ISO timestamp>`。成功后输出：

- `remotePostName`
- Halo 编辑地址
- Halo 预览地址（响应包含 permalink 时）

缺少任一必需变量时，命令会明确输出 `skipped` 并正常退出。PAT 不应写入仓库、命令历史截图、CI 变量或测试快照。

## 本地私有 Halo

私网、回环地址默认被 SSRF 防护拒绝。本地开发确实需要访问局域网 Halo 时，可临时设置：

```powershell
$env:NODE_ENV="development"
$env:ALLOW_PRIVATE_HALO_URLS="true"
```

生产环境始终禁止该绕过，并要求 HTTPS。

## Fake Halo

无真实实例时先运行：

```powershell
npm run dev:fake-halo
```

Fake Halo 用于 UI 和 Worker 回归，不等同于真实 smoke test，也不验证实际 PAT 权限。
