# dsh-models-dev — DeepSeek Harness 模型上下文数据同步插件

为 DeepSeek Harness 从 models.dev 拉取模型数据，按「供应方 + 模型 id」组成的键，
为 `~/.dsh/settings.yaml`（或 `.yml`）中未设置 `contextWindow` 的模型条目补全上下文窗口。
拉取行为手动触发；镜像、代理与匹配策略在设置面板里配置；同步结果与调试日志内联显示并可导出。

## 为什么需要它

DeepSeek Harness 对模型上下文大小的解析链是（`llm-pi-ai`）：

```
contextWindow = settings 条目值 ?? 内置 catalog 值 ?? 路由默认值（262144）
```

settings.yaml 里没写的模型用的是内置 catalog 或路由默认值。本插件把 models.dev 的
精确值写回 settings 用户文档，让解析链第一项命中；**只补缺失值，绝不覆盖已显式设置**
的 `contextWindow`。只写 `contextWindow`，不写 `maxTokens`（pi-ai 会把显式 `maxTokens`
当 per-request 默认值，属行为变更）。

## 数据源与匹配

- 数据源：models.dev CDN `api.json`（默认，provider 键控）/ 任意镜像 URL / GitHub
  官方仓库 `anomalyco/models.dev`（镜像备选，取签入的 `models.json`）。加载器自动识别两种格式。
- 解析优先级（settings 里的 provider + 模型 id）：
  1. provider 与模型**精确匹配**（含供应方别名解析后）；
  2. **取值优先的 provider**（按列表顺序取第一个持有该模型的）；
  3. **聚合策略**（mode 众数 / max / min）按模型 id 跨 provider 聚合。
- 未命中条目跳过并计入报告。只处理 `llm-pi-ai`（`llm-deepseek` 有官方硬编码兜底）。

## 设置面板（M3）

新注册一个 `settings.section` 页面（id `models-sync`，不改动官方 Models 页），提供：

- 数据源选择（models.dev / 自定义 URL / GitHub repo@ref#file）、代理地址（控制连接
  models.dev 的代理）、聚合策略（mode/max/min，带说明）、取值优先的 provider（独立
  优先级）、供应方别名；只处理 `llm-pi-ai`，无「补全目标」选项；
- **查询 context 数据**：输入 provider（自动走别名）+ model id，按当前匹配配置返回该
  模型的 contextWindow 与 maxTokens，并标注命中方式（精确/别名/取值优先/聚合）；
- **立即同步**按钮（手动触发；先保存配置再执行，结果内联显示：写入/跳过/未命中/错误）；
- **调试开关**：打开后记录同步调试日志（拉取耗时、命中路径、写回明细等）。日志只在
  面板内联显示，不写宿主/浏览器日志；**关闭时不记录任何日志**；
- **日志大小限制**（MB）：`-1` 无限制增长；正数为上限，超限丢弃最早记录并标记截断；
  输入校验只接受 `-1` 或正整数；
- **导出为 JSON 文件**：把当前调试日志（含配置、上限、截断标记、记录）下载为 JSON。

## 目录结构

```
src/
  core/        纯函数核心：types / normalize / resolve / plan / fetch
  integration/ host-sync.ts：依赖注入的同步编排（含 onDebug 调试采集）
  contract.ts  Typert wire 契约（zod 描述，宿主清单与客户端贡献共用）
  settings.ts  models-sync 命名空间 schema（schemastery，含 debug/maxLogMb）
  runtime.ts   modelsSync 远程服务实现（配置读写 + run 触发同步）
  typert.ts    宿主 Typert 清单
  index.ts     宿主插件入口（name/inject/apply）
  types.ts     共享 JSON 类型
  client/      客户端半区：remote.ts / index.ts / ModelsSyncSection.tsx /
               debug-buffer.ts / locales.ts
  cli/         独立 CLI（M1/M2 验证通道，用 bun 跑）
tests/         单元测试（vitest）
cordis.patch.yml  插件包补丁（挂进 profile bundle 自动应用）
dsh.plugin.json   插件元数据
build.mjs     esbuild 宿主 + 客户端构建，tsc 出声明到 lib/types
```

## 本地开发

```sh
pnpm install --store-dir ./.pnpm-store --cache-dir ./.pnpm-cache
pnpm run check          # typecheck + test + build
pnpm run typecheck
pnpm run test
pnpm run build          # 产出 lib/index.js（宿主）+ lib/client.js（客户端）+ lib/types

# CLI 干跑 / 写回（M1/M2 验证通道，独立于 DSH）
bun ./src/cli/index.ts --dry-run
bun ./src/cli/index.ts --github anomalyco/models.dev@dev#models.json --dry-run
cp ~/.dsh/settings.yaml .scratch/settings-test.yaml
bun ./src/cli/index.ts --settings .scratch/settings-test.yaml --apply
```

## 挂载到 profile（dsh-at-file 同款，待用户验收后执行）

```sh
# 1) 构建产物已就绪（lib/）
# 2) ~/.dsh/profiles/web/package.json
#    dependencies: { "@deepseek-ai/dsh-models-sync": "file:/home/wold9168/Documents/_WIP/dsh-models-dev" }
#    dsh.profile.bundles: [ "@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@deepseek-ai/dsh-models-sync" ]
# 3) 在 ~/.dsh/profiles/web/ 下 pnpm install
# 4) 重建/重启 web（dsh web 或 dev:web），刷新页面
```

插件包自身的 `cordis.patch.yml` 作为 bundle 自动应用，无需再改 profile 补丁。

## 里程碑

- [x] M1 Host：fetch + normalize，CLI 干跑对真实 `~/.dsh/settings.yaml` 验证
- [x] M2 Host：resolve + plan + 写回（副本验证只补缺失、保留显式值）
- [x] M3 Client：settings.section 页面 + Host RPC + 镜像/代理配置 + 调试开关/导出
- [ ] M4 挂载：profile bundle 安装 + web 重建（待用户验收）
