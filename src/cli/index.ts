#!/usr/bin/env bun
/**
 * 独立同步 CLI：从 models.dev（或镜像/GitHub 仓库）拉取数据，对本地
 * settings.yaml/.yml 干跑（默认）或写回（--apply）。
 *
 * 这是 M1/M2 的验证通道：不依赖 DSH 运行时，直接用 yaml 包读文件、用
 * 叶子级 diff 写回，与 DSH settings-file provider 的写回方式一致。接入
 * Harness 后同一套核心由 Host 插件经 ctx.settings 驱动。
 */
import { parseArgs } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseDocument } from 'yaml'
import { fetchJson, sourceUrl } from '../core/fetch.ts'
import { normalize, countModels } from '../core/normalize.ts'
import { planSync } from '../core/plan.ts'
import type { PlanInput } from '../core/plan.ts'
import type { MatchPolicy, SyncConfig, SyncReport } from '../core/types.ts'
import { formatReport } from './report.ts'

interface Args {
  settings?: string
  source?: string
  github?: string
  proxy?: string
  policy?: string
  alias?: string[]
  preferred?: string
  targets?: string
  apply: boolean
  'dry-run': boolean
  json: boolean
  timeout?: string
  help: boolean
}

function usage(): string {
  return `用法: dsh-models-sync [选项]

从 models.dev（或镜像/GitHub 仓库）拉取模型数据，按 (provider, modelId) 键
为 settings.yaml 中缺失 contextWindow 的模型条目补全上下文窗口。

选项:
  --settings <path>      settings 文件路径（默认 $DSH_HOME 或 ~/.dsh/settings.yaml）
  --source <url>         数据源 URL（任意镜像）
  --github <repo[@ref[#file]]>  从 GitHub 仓库 raw 取数（默认 anomalyco/models.dev@dev#models.json）
  --proxy <url>          HTTP(S) 代理
  --policy <mode|max|min|first>  模型 id 回退聚合策略（默认 mode）
  --alias <settings=md>  供应方别名映射，可多次（如 --alias scnet=openrouter）
  --preferred <a,b,c>    'first' 策略与平局偏好的 provider 顺序
  --targets <pi-ai,deepseek>  要补全的命名空间（默认两者）
  --apply                写回 settings 文件（默认 dry-run）
  --dry-run              显式声明只预览不落盘（默认即如此）
  --json                 输出 JSON 报告
  --timeout <ms>         请求超时（默认 30000）
  --help                 显示本帮助
`
}

function parseGithubSpec(spec: string): { repo: string; ref: string; file: string } {
  const parts = spec.split('#')
  const repoRef = parts[0] ?? ''
  const file = parts[1] ?? 'models.json'
  const repoParts = repoRef.split('@')
  const repo = repoParts[0] ?? ''
  const ref = repoParts[1] ?? 'dev'
  return { repo, ref, file }
}

function defaultSettingsPath(): string {
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  return join(home, 'settings.yaml')
}

/** 解析 --targets 参数。 */
function parseTargets(spec: string | undefined): { llmPiAi: boolean; llmDeepseek: boolean } {
  const targets = { llmPiAi: true, llmDeepseek: true }
  if (spec === undefined) return targets
  for (const part of spec.split(',')) {
    if (part === 'pi-ai') targets.llmPiAi = true
    else if (part === 'deepseek') targets.llmDeepseek = true
    else if (part === '-pi-ai') targets.llmPiAi = false
    else if (part === '-deepseek') targets.llmDeepseek = false
    else throw new Error(`未知 target: ${part}`)
  }
  return targets
}

async function main(): Promise<void> {
  let parsed: { values: Args }
  try {
    parsed = parseArgs({
      options: {
        settings: { type: 'string' },
        source: { type: 'string' },
        github: { type: 'string' },
        proxy: { type: 'string' },
        policy: { type: 'string' },
        alias: { type: 'string', multiple: true },
        preferred: { type: 'string' },
        targets: { type: 'string' },
        apply: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        timeout: { type: 'string' },
        help: { type: 'boolean', default: false },
      },
      allowPositionals: false,
    }) as { values: Args }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.stderr.write(usage())
    process.exit(2)
  }
  const args = parsed.values

  if (args.help) {
    process.stdout.write(usage())
    return
  }

  const policy = (args.policy ?? 'mode') as MatchPolicy
  if (!['mode', 'max', 'min', 'first'].includes(policy)) {
    process.stderr.write(`未知策略: ${policy}\n`)
    process.exit(2)
  }

  const aliases: Record<string, string> = {}
  for (const pair of args.alias ?? []) {
    const eq = pair.indexOf('=')
    if (eq === -1) {
      process.stderr.write(`alias 需为 settings=models.dev 形式: ${pair}\n`)
      process.exit(2)
    }
    aliases[pair.slice(0, eq)] = pair.slice(eq + 1)
  }

  const config: SyncConfig = {
    source: args.source !== undefined
      ? { kind: 'url', url: args.source }
      : args.github !== undefined
        ? { kind: 'github', github: parseGithubSpec(args.github) }
        : { kind: 'api' },
    ...args.proxy === undefined ? {} : { proxy: args.proxy },
    matching: {
      ...Object.keys(aliases).length > 0 ? { aliases } : {},
      ...args.preferred === undefined ? {} : { preferredProviders: args.preferred.split(',').map(s => s.trim()).filter(s => s.length > 0) },
      policy,
    },
    targets: parseTargets(args.targets),
  }

  // 拉取 + 归一化
  const url = sourceUrl(config.source)
  let raw: unknown
  try {
    raw = await fetchJson(url, config.proxy, args.timeout === undefined ? undefined : Number(args.timeout))
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  }
  const index = normalize(raw)
  const sourceModels = countModels(index)

  // 读取 settings 用户文档
  const settingsPath = resolve(args.settings ?? defaultSettingsPath())
  let documentText: string
  try {
    documentText = await readFile(settingsPath, 'utf8')
  } catch (error) {
    process.stderr.write(`无法读取 settings 文件 ${settingsPath}: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  }
  const document = parseDocument(documentText, { prettyErrors: true })
  if (document.errors.length > 0) {
    process.stderr.write(`settings 文件解析失败: ${document.errors.map(e => e.message).join('; ')}\n`)
    process.exit(1)
  }
  const root = document.toJS() as Record<string, unknown> | null ?? {}

  const input: PlanInput = {
    llmPiAi: isObject(root['llm-pi-ai']) ? root['llm-pi-ai'] : undefined,
    llmDeepseek: isObject(root['llm-deepseek']) ? root['llm-deepseek'] : undefined,
  }

  const targets = {
    llmPiAi: config.targets?.llmPiAi ?? true,
    llmDeepseek: config.targets?.llmDeepseek ?? true,
  }
  const planned = planSync(input, index, config.matching ?? {}, targets)

  const report: SyncReport = {
    written: planned.writes,
    skipped: planned.skipped,
    unresolved: planned.unresolved,
    errors: sourceModels === 0 ? [`数据源未识别出模型（来源 ${config.source.kind}）`] : [],
    source: url,
    fetchedAt: new Date().toISOString(),
    sourceModels,
  }

  let applied = false
  if (args.apply) {
    if (!settingsPath.endsWith('.yaml') && !settingsPath.endsWith('.yml')) {
      process.stderr.write('--apply 目前仅支持 .yaml/.yml 文件，避免改写 JSON 格式的 settings\n')
      process.exit(2)
    }
    applyWrites(document, planned.writes)
    await writeFile(settingsPath, document.toString())
    applied = true
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ ...report, applied }, null, 2)}\n`)
  } else {
    process.stdout.write(formatReport(report, applied))
    process.stdout.write('\n')
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 叶子级 diff 写回：只对每条计划写入的 contextWindow 字段 setIn，保留其余注释与格式。 */
function applyWrites(
  document: ReturnType<typeof parseDocument>,
  writes: { ns: string; provider: string; entryIndex: number; contextWindow: number }[],
): void {
  for (const write of writes) {
    const path = write.ns === 'llm-pi-ai'
      ? ['llm-pi-ai', 'providers', write.provider, 'models', write.entryIndex, 'contextWindow']
      : ['llm-deepseek', 'models', write.entryIndex, 'contextWindow']
    document.setIn(path, write.contextWindow)
  }
}

await main()
