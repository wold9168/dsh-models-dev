# AGENTS.md

本仓库为 DeepSeek Harness 设计并实现一个「模型上下文数据同步」插件（项目代号 dsh-models-dev）。工作目标、DSH 侧的机制事实、数据源格式与关键设计决策都在下文，先读再动手。

## 项目目标

- 从 models.dev 拉取模型数据，数据源可配置为：
  - models.dev CDN（默认 `https://models.dev/api.json`）；
  - 任意镜像 URL（用户自建镜像等）；
  - GitHub 仓库 `github.com/anomalyco/models.dev/`（models.dev 官方开源仓库，作为 CDN 不可达时的备选来源）。
- 为 `$DSH_HOME/settings.yaml`（或 `.yml`/`.json`）中**未设置** `contextWindow` 的模型条目，按「供应方 + 模型 id」组成的键补全上下文窗口数据。
- 拉取行为**手动触发**；触发开关与镜像、代理等配置放在 DeepSeek Harness 的设置面板里。

只补缺失值，绝不覆盖用户已显式设置的 `contextWindow`（用户显式值优先）。

## DSH 如何决定模型的上下文大小（机制事实）

模型能力由 llm 注册表（`ctx.llm`）上的 adapter 提供。本插件要写的是两个官方 provider 的 settings 命名空间：

- `llm-deepseek`（直连 DeepSeek，单路由 `deepseek-official`）
- `llm-pi-ai`（通用 provider，路由 = `llm-pi-ai.providers.<name>`）

### 上下文解析链（这是「未设置时缺什么」的答案）

`packages/llm/llm-deepseek/src/adapter.ts` `resolveModel`：

```
contextWindow = configured?.contextWindow ?? connection.defaultContextWindow
```

`packages/llm/llm-pi-ai/src/catalog.ts` `resolveModels`：

```
contextWindow = entry.contextWindow ?? base?.contextWindow ?? request.defaultContextWindow
```

- `configured`/`entry` 是 settings 用户文档里该模型的条目；
- `base` 是 pi-ai 安装内置 catalog 的条目（`entry` 未列出时 catalog 兜底）；
- `request.defaultContextWindow` 是路由级兜底：pi-ai 默认 262_144，llm-deepseek 默认 1_000_000。

所以「没有在 settings.yaml 里设置上下文大小」的模型，实际用的是 catalog 或路由默认值。本插件的价值就是把 models.dev 的精确值写回 settings 用户文档，让解析链第一项命中。

### 模型条目需要哪些数据

`packages/llm/llm/src/types.ts`：`LlmResolvedModelInfo` 含 `context.contextWindow`、`defaultMaxTokens`、`inputModalities`、`reasoning` 等。

**关键约束：本插件只写 `contextWindow`，绝不写 `maxTokens`。** pi-ai 对 settings 条目里显式配置的 `maxTokens` 会把它变成 per-request 默认值（行为变更），而 `contextWindow` 只是能力元数据（纯信息）。models.dev 的 `limit.output` 因此默认不落盘。

### settings 服务与文档结构

- 文档位于 `<dshHome>/settings.yaml`，命名空间 = 插件短名（`llm-pi-ai`、`llm-deepseek`、`agent-default-model` 等）。
- 服务 API（`packages/settings/settings/src/index.ts`，`SettingsProvider`）：
  - `get(ns)` —— 读已注册命名空间的解析值；
  - `update(ns, patch)` —— 合并 patch 进用户层（对象深合并、数组整体替换）；
  - `replace(ns, section)`、`mutate(ns, ops)`；
  - `register(ns, schema, {base})` —— 只能注册一次，`llm-pi-ai`/`llm-deepseek` 已被其插件注册，本插件是 **consumer**，用 `get`/`update` 读写即可。
- `settings-file` provider 用「叶子级 diff」写回，未改动的条目保留注释与格式；外部编辑会热发布（chokidar watch），且 `settings/updated` 事件会推给设置面板各页面自动刷新。
- 写回走 `ctx.settings.update('llm-pi-ai', { providers: { <name>: { models: [...] } } })`：provider 对象深合并、只替换被触碰 provider 的 `models` 数组，其它 provider 与命名空间不受影响。schema 由 pi-ai/deepseek 插件校验，写入值必须过它们 Config 的 schema（`contextWindow` 是可选正整数，天然合法）。
- 更新是 `live` 生效：`llm-pi-ai`/`llm-deepseek` 用 `installSettingsSection`，下次请求即用新值，无需重启。

### 用户当前 settings.yaml 样例（见 `~/.dsh/settings.yaml`）

```yaml
llm-pi-ai:
  providers:
    scnet:
      api: openai-completions
      baseURL: https://api.scnet.cn/api/llm/v1
      models:
        - id: DeepSeek-V4-Flash-0731     # 无 contextWindow —— 本插件要补的目标
        - id: DeepSeek-V4-Pro            # 无 contextWindow
    opencode:
      models:
        - id: deepseek-v4-flash-free
          contextWindow: 200000          # 已设置 —— 不得覆盖
        - id: big-pickle                 # 无 contextWindow
```

注意 `llm-pi-ai.providers.nvidia` 没有 `models` 列表：它走 pi-ai 内置 catalog（`base` 层，本身有值），**不属于本插件的写入对象**。插件只写用户文档中显式列出的 `models` 条目。

## models.dev 数据源（已实测）

### CDN 端点

- `https://models.dev/api.json` —— **provider 键控**（正是 (provider, modelId) 键），约 190+ provider：
  ```json
  { "opencode": { "id": "opencode", "models": {
      "deepseek-v4-flash-free": { "id": "...", "limit": { "context": 200000, "output": ... }, "cost": {...} }
  } } }
  ```
- `https://models.dev/models.json` —— 模型本体元数据，`org/model` 路径式 id → `limit.context`（provider 无关）。
- `https://models.dev/catalog.json` —— `{ models, providers }` 合并（体积最大）。

### GitHub 仓库（镜像备选）

`github.com/anomalyco/models.dev/`，默认分支 `dev`：

- 源数据是 TOML（`providers/<id>/provider.toml` + `providers/<id>/models/<model>.toml`、`models/<org>/<model>.toml`）；
- 根目录**已签入**一个 `models.json`：扁平列表 `[{ id: "org/model", context_length, top_provider: {context_length, max_completion_tokens}, ... }]`，约 364 条；
- `api.json`/`catalog.json` **未签入**（部署时由 Cloudflare worker 从 TOML 生成）。

因此镜像有两个可用形态：

1. 直接指 CDN api.json（`https://models.dev/api.json`）或其任意镜像 URL —— provider 键控，保真度最高；
2. 指 GitHub raw `models.json`（`https://raw.githubusercontent.com/anomalyco/models.dev/dev/models.json`）—— 模型级数据，`org` 视为 provider 维度的近似，id 为 `org/model`。

插件的数据加载器按结构自动识别两种格式（`limit.context` 与 `context_length`）并归一化成统一索引。

### (provider, modelId) 键与匹配（已用用户真实数据验证）

- 用户 `opencode` 段的模型在 models.dev 的 `opencode` 条目下**全部精确命中**（如 `opencode:deepseek-v4-flash-free` → 200000、`opencode:big-pickle` → 200000、`opencode:nemotron-3-ultra-free` → 1000000）。这是主路径：**精确 (provider, modelId) 查表**。
- `scnet` 不在 models.dev 中，其模型（如 `DeepSeek-V4-Flash-0731`）需**按模型 id 跨 provider 匹配**回退。
- 同一模型在不同 provider 下 context 差异可以很大（`deepseek-v4-flash-0731` 从 256000 到 1310720），所以回退匹配的**聚合策略必须可配置**（mode 众数 / max / min / 首选 provider 优先），不能用死值。
- 归一化规则：小写 + 去掉非字母数字（`DeepSeek-V4-Flash-0731` → `deepseekv4flash0731`）；对 models.dev 的 id 同时索引「完整 id」与「`/` 后段」，以容纳 `deepseek/deepseek-v4-flash-0731` 这类前缀。

### 匹配顺序（一次同步内的解析流程）

对 settings 条目 (P, M) 缺 `contextWindow`：

1. `index[P][M]` 精确命中；
2. 配置的 alias 映射（`aliases: { scnet: openrouter }`）→ `index[alias(P)][M]`；
3. model-id 归一化匹配 + 聚合策略（mode / max / min / first，`preferredProviders` 优先）；
4. 仍未命中 → 跳过，计入报告 `unresolved`。

## 插件架构

DSH 静态包（TypeScript ESM，遵循 DSH 包风格；未来挂进 host composition 的 `cordis.yml` 行）。Host 与 Client 两个半区。

### Host 半区（建议包名 `@deepseek-ai/dsh-models-sync`）

- **fetcher**：按配置取数 —— 源 URL（默认 CDN api.json）、镜像 URL、GitHub raw；支持 HTTP(S) 代理（Host 侧网络请求，参考 DSH `packages/web/tool-web/src/fetch.ts` 与连接层的代理约定）；带超时与重试（`streamIdleTimeoutMs` 之外的简单策略即可）。
- **normalizer**：按结构识别 `limit.context` / `context_length`，产出统一索引
  `{ provider: { modelId: { contextWindow } } }` + 模型 id 二级索引。
- **resolver**：实现上面的匹配顺序。
- **writer**：`ctx.settings.get('llm-pi-ai' | 'llm-deepseek')` → 找缺 `contextWindow` 的条目 → 解析 → `ctx.settings.update(...)` 合并写回（只在有实际变化时写）。
- **RPC**：暴露给 Client 的触发入口（`run`），返回报告 `{ written: [{provider, model, contextWindow}], skipped, unresolved, errors }`。
- 插件自身的配置命名空间 `models-sync`（`installSettingsSection` 注册），含：
  ```yaml
  models-sync:
    source:
      kind: api            # api | url | github
      url: https://models.dev/api.json
      github: { repo: anomalyco/models.dev, ref: dev, file: models.json }
    proxy: http://127.0.0.1:7890   # 可选；留空不走代理
    matching:
      aliases: { scnet: openrouter }
      preferredProviders: [ openrouter, nvidia ]
      policy: mode          # mode | max | min | first
    targets: { llmPiAi: true, llmDeepseek: true }
    debug: false            # 调试开关：打开才记录同步调试日志（仅面板内联 + 导出）
    maxLogMb: 2             # 日志大小限制（MB）：-1 无限制；正数=上限
  ```

### 调试日志（M3）

- 位置：**仅设置面板内联显示**，不写宿主/浏览器日志；`debug` 关闭时不采集任何记录（host 不发出、client 不落缓冲），不占用资源。
- 宿主在 `syncViaSettings` 收到 `options.onDebug` 时发出关键步骤记录（拉取耗时、命中路径、写回明细、未命中、错误），随 wire 报告带回。
- 客户端用 `src/client/debug-buffer.ts` 的 `appendDebugRecords` 维护有界缓冲（UTF-8 字节估算），`maxLogMb` 控制上限，超限丢最早并标记 truncated。
- 面板提供「导出为 JSON 文件」：序列化缓冲（含配置、上限、截断标记、记录），导出前对代理 URL 去凭证。

### Client 半区（建议包名 `@deepseek-ai/dsh-client-ui-models-sync`）

- 注册 `settings.section` 新页面（slot 契约在 `packages/client/ui-settings/src/client/contract/slots.ts`；现有 Models 页是 `id: 'models', order: 10`）。新页面 id 建议 `models-sync`，作为独立页面，**不改动**官方 `ui-settings-models` 包。
- 页面内容：
  - 「立即同步」按钮（手动触发开关）；
  - 数据源配置：CDN / 自定义镜像 URL / GitHub 仓库（repo + ref）；
  - 代理配置；
  - 匹配策略（alias、首选 provider、聚合策略）；
  - 同步结果报告（成功/跳过/未命中）。
- 自身配置经 `ctx.settingsScope` 绑定 `models-sync` 命名空间读写；同步动作经 Host RPC 触发；结果回传展示。
- 同步完成后 `settings/updated` 事件会自动刷新官方 Models 页，无需额外联动。

## 目录结构

```
dsh-models-dev/
  AGENTS.md / README.md / LICENSE
  package.json / pnpm-workspace.yaml / tsconfig.json / vitest.config.ts / pnpm-lock.yaml
  build.mjs               # esbuild 宿主 + 客户端构建，tsc 出声明到 lib/types
  cordis.patch.yml        # 插件包补丁：插入宿主行（挂进 profile bundle 自动应用）
  dsh.plugin.json         # 插件元数据（entry.name / client.platform）
  src/
    core/            纯函数核心：types / normalize / resolve / plan / fetch
    integration/     host-sync.ts：依赖注入的同步编排（含 onDebug 调试采集）
    contract.ts      Typert wire 契约（zod 描述，宿主清单与客户端贡献共用）
    settings.ts      models-sync 命名空间 schema（schemastery，含 debug/maxLogMb）
    runtime.ts       modelsSync 远程服务实现（getConfig/updateConfig/run）
    typert.ts        宿主 Typert 清单
    index.ts         宿主插件入口（name/inject/apply）
    types.ts         共享 JSON 类型
    client/          客户端半区：remote.ts / index.ts / ModelsSyncSection.tsx /
                     debug-buffer.ts / locales.ts
    cli/             独立 CLI（M1/M2 验证通道，bun 跑）：index.ts / report.ts
  tests/             单元测试（vitest）：normalize / resolve / plan / debug
```

## 约定

- TypeScript ESM，`"type": "module"`；包名 `@deepseek-ai/dsh-models-sync`；DSH 包以
  `link:../deepseek-harness/...` 进 devDependencies（pnpm install 需 `--store-dir/--cache-dir`
  指到工作区，沙箱里 ~/.local/share/pnpm 不可写）。
- 宿主 bundle external 掉 `@deepseek-ai/*`、cordis、undici、zod、yaml（undici 打包进
  ESM 会在 Node 崩溃）；客户端 bundle 打包 zod、external 掉 react 与 `@deepseek-ai/*`。
- **注册即效果**：一切服务、事件、Slot、RPC 注册都挂在 `apply(ctx)` 生命周期上并返回 disposer。
- 测试描述行为而非正确性：normalize / resolve / plan / debug-buffer 是纯函数，优先单测。
- 只读 DSH 源码以确认 API，不要把 Inspect/目录清单当业务数据。
- 文档用人类书写习惯；不引入不必要依赖（引入新依赖前先用 question 请示用户）。
- 一切 git 操作需用户明确同意，不自作主张提交。

## 里程碑

- [x] M1 Host：fetch + normalize，做成可独立运行的 CLI/脚本，对真实 `~/.dsh/settings.yaml` 干跑验证。
- [x] M2 Host：resolve + write，确认只补缺失值、不覆盖显式值、写回过 schema（副本上验证）。
- [x] M3 Client：settings.section 页面 + Typert RPC + 镜像/代理配置 + 调试开关/大小限制/导出 JSON（`src/client/`，已构建并加载验证）。
- [ ] M4 挂载：把本包加进 `~/.dsh/profiles/web/` 的 dependencies 与 dsh.profile.bundles，pnpm install + 重建 web（待用户验收后执行）。

## 参考资料（DSH 检出路径）

- `packages/llm/llm/src/types.ts` —— `LlmResolvedModelInfo` 等模型元数据结构
- `packages/llm/llm-deepseek/src/adapter.ts`、`src/index.ts` —— deepseek 解析链与 settings 接线
- `packages/llm/llm-pi-ai/src/catalog.ts`、`src/config.ts` —— pi-ai catalog 解析链与默认值
- `packages/settings/settings/src/index.ts` —— settings 服务（get/update/replace/mutate/register）
- `packages/settings/settings-file/src/index.ts` —— YAML 文档、叶子级 diff、热发布
- `packages/client/ui-settings/src/client/contract/slots.ts` —— `settings.section` slot 契约
- `packages/client/ui-settings-models/src/client/index.ts`、`ModelsSection.tsx` —— 现有 Models 设置页参考
- models.dev：`https://models.dev/api.json`、`https://models.dev/models.json`、`https://models.dev/catalog.json`、仓库 `github.com/anomalyco/models.dev`（默认分支 `dev`）
