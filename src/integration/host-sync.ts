/**
 * Host 侧同步编排：取数 -> 归一化 -> 计划 -> 写回 settings。
 *
 * 通过依赖注入的 SettingsAccess 使用 settings 服务，因此本模块不依赖 DSH
 * 包即可独立单测；真正的 `ctx.settings` 适配见 integration/dsh/host-plugin.ts。
 * 传 options.onDebug 时在关键步骤发出调试记录（仅开关打开时收集）。
 */
import type { DebugRecord, SyncConfig, SyncReport } from '../core/types.ts'
import { fetchJson, sourceUrl } from '../core/fetch.ts'
import { countModels, normalize } from '../core/normalize.ts'
import { buildUpdatePatch, planSync } from '../core/plan.ts'
import type { PlanInput } from '../core/plan.ts'

/** ctx.settings 的最小结构切片：读用户层、合并写回。 */
export interface SettingsAccess {
  /** 命名空间的原始用户层（describe().user），无则 undefined。 */
  user(ns: string): Record<string, unknown> | undefined
  /** 把合并补丁写入命名空间的用户层。 */
  update(ns: string, patch: Record<string, unknown>): Promise<void>
}

/** 一次同步的输入。 */
export interface SyncRunOptions {
  now?: string
  timeoutMs?: number
  /** 调试记录接收器；传入即开启调试采集。 */
  onDebug?: (record: DebugRecord) => void
}

const DEFAULT_TARGETS = { llmPiAi: true, llmDeepseek: true }

/**
 * 执行一次完整同步：拉取 -> 归一化 -> 计划 -> 对每个有变化的命名空间合并写回。
 * 网络或数据源错误记入报告 errors，不中断已解析的部分。
 */
export async function syncViaSettings(
  settings: SettingsAccess,
  config: SyncConfig,
  options: SyncRunOptions = {},
): Promise<SyncReport> {
  const fetchedAt = options.now ?? new Date().toISOString()
  const url = sourceUrl(config.source)
  const errors: string[] = []
  const emit = options.onDebug
  let index = new Map<string, Map<string, { contextWindow: number; maxOutput?: number }>>()
  let sourceModels = 0
  emit?.({ ts: new Date().toISOString(), level: 'info', message: `开始同步，源 ${config.source.kind}: ${url}` })

  try {
    const start = performance.now()
    const raw = await fetchJson(url, config.proxy, options.timeoutMs)
    const fetchMs = performance.now() - start
    index = normalize(raw)
    sourceModels = countModels(index)
    emit?.({ ts: new Date().toISOString(), level: 'info', message: `拉取完成 ${url}，耗时 ${Math.round(fetchMs)}ms，识别模型 ${sourceModels} 条` })
    if (sourceModels === 0) {
      errors.push(`models-sync: ${url} 未识别出模型数据（格式不符或为空）`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`models-sync: 拉取 ${url} 失败：${message}`)
    emit?.({ ts: new Date().toISOString(), level: 'error', message: `拉取失败 ${url}: ${message}` })
  }

  const targets = { ...DEFAULT_TARGETS, ...config.targets }
  const input: PlanInput = {
    llmPiAi: settings.user('llm-pi-ai') as PlanInput['llmPiAi'] | undefined,
    llmDeepseek: settings.user('llm-deepseek') as PlanInput['llmDeepseek'] | undefined,
  }
  const matching = config.matching ?? {}
  const planned = planSync(input, index, matching, targets)

  for (const write of planned.writes) {
    const via = write.kind === 'exact'
      ? '精确'
      : write.kind === 'alias'
        ? `alias(${write.matchedProvider ?? '?'})`
        : `匹配(${write.matchedProvider ?? '?'})`
    emit?.({
      ts: new Date().toISOString(),
      level: 'info',
      message: `写入 [${write.ns}] ${write.provider} / ${write.model} -> ${String(write.contextWindow)} (${via})`,
      data: {
        ns: write.ns, provider: write.provider, model: write.model,
        contextWindow: write.contextWindow, kind: write.kind,
        ...write.matchedProvider === undefined ? {} : { matchedProvider: write.matchedProvider },
      },
    })
  }
  for (const miss of planned.unresolved) {
    emit?.({
      ts: new Date().toISOString(),
      level: 'warn',
      message: `未命中 [${miss.ns}] ${miss.provider} / ${miss.model}（候选 ${String(miss.candidates)}）`,
      data: { ns: miss.ns, provider: miss.provider, model: miss.model, candidates: miss.candidates },
    })
  }

  for (const ns of ['llm-pi-ai', 'llm-deepseek'] as const) {
    const patch = buildUpdatePatch(ns, input, planned.writes)
    if (patch === undefined) continue
    try {
      await settings.update(ns, patch)
      const count = planned.writes.filter(w => w.ns === ns).length
      emit?.({ ts: new Date().toISOString(), level: 'info', message: `写回 ${ns}：${count} 条 contextWindow` })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`models-sync: 写回 ${ns} 失败：${message}`)
      emit?.({ ts: new Date().toISOString(), level: 'error', message: `写回失败 ${ns}: ${message}` })
    }
  }

  return {
    written: planned.writes,
    skipped: planned.skipped,
    unresolved: planned.unresolved,
    errors,
    source: url,
    fetchedAt,
    sourceModels,
  }
}
