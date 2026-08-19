/**
 * 同步计划器：遍历用户 settings 文档（llm-pi-ai / llm-deepseek 命名空间的原始
 * 用户层），对缺省 contextWindow 的模型条目逐一解析，产出：
 * - writes：应补入 contextWindow 的条目（含 entryIndex，供叶子级写回定位）；
 * - skipped：跳过原因（已显式设置、id 缺失等）；
 * - unresolved：任何来源都未命中的条目。
 *
 * 只补缺失值：已有 contextWindow 的条目一律跳过，绝不覆盖用户显式设置。
 */
import type {
  MatchingConfig, PlannedWrite, ProviderIndex, SkippedEntry, UnresolvedEntry,
} from './types.ts'
import { resolveContext } from './resolve.ts'

/** settings 用户文档中一个模型条目的最小形状。 */
interface ModelEntry {
  id?: unknown
  contextWindow?: unknown
}

/** 各命名空间的用户文档形状（宽松，允许任意 provider 字段）。 */
export interface PlanInput {
  llmPiAi?: { providers?: Record<string, Record<string, unknown>> }
  llmDeepseek?: { models?: unknown }
}

export interface PlanResult {
  writes: PlannedWrite[]
  skipped: SkippedEntry[]
  unresolved: UnresolvedEntry[]
}

function asModelsArray(value: unknown): ModelEntry[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value as ModelEntry[]
}

function isSetContextWindow(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

/** 计划一个命名空间的模型数组。 */
function planNamespace(
  writes: PlannedWrite[],
  skipped: SkippedEntry[],
  unresolved: UnresolvedEntry[],
  ns: 'llm-pi-ai' | 'llm-deepseek',
  provider: string,
  models: unknown,
  index: ProviderIndex,
  matching: MatchingConfig,
): void {
  const entries = asModelsArray(models)
  if (entries === undefined) return
  entries.forEach((entry, entryIndex) => {
    const model = typeof entry?.id === 'string' ? entry.id : undefined
    if (model === undefined) {
      skipped.push({ ns, provider, model: '<无 id>', reason: '条目缺少 id' })
      return
    }
    if (entry.contextWindow !== undefined) {
      skipped.push({
        ns, provider, model,
        reason: isSetContextWindow(entry.contextWindow)
          ? '已设置 contextWindow'
          : 'contextWindow 非正整数，跳过不覆盖',
      })
      return
    }
    const resolved = resolveContext(index, provider, model, matching)
    if (resolved === undefined) {
      unresolved.push({ ns, provider, model, candidates: 0 })
      return
    }
    writes.push({
      ns,
      provider,
      model,
      entryIndex,
      contextWindow: resolved.contextWindow,
      kind: resolved.kind,
      ...resolved.matchedProvider === undefined ? {} : { matchedProvider: resolved.matchedProvider },
    })
  })
}

/** 生成同步计划。 */
export function planSync(
  input: PlanInput,
  index: ProviderIndex,
  matching: MatchingConfig,
  targets: { llmPiAi: boolean; llmDeepseek: boolean },
): PlanResult {
  const writes: PlannedWrite[] = []
  const skipped: SkippedEntry[] = []
  const unresolved: UnresolvedEntry[] = []
  if (targets.llmPiAi && input.llmPiAi?.providers !== undefined) {
    for (const [provider, pconf] of Object.entries(input.llmPiAi.providers)) {
      planNamespace(writes, skipped, unresolved, 'llm-pi-ai', provider, pconf['models'], index, matching)
    }
  }
  if (targets.llmDeepseek && input.llmDeepseek !== undefined) {
    planNamespace(
      writes, skipped, unresolved, 'llm-deepseek', 'deepseek-official', input.llmDeepseek['models'], index, matching,
    )
  }
  return { writes, skipped, unresolved }
}

/**
 * 由计划写出一份 `settings.update` 合并补丁：对象深合并、数组整体替换，所以
 * 补丁里被触碰的 provider 只携带替换后的 `models`，其它字段与命名空间不动。
 */
export function buildUpdatePatch(
  ns: 'llm-pi-ai' | 'llm-deepseek',
  input: PlanInput,
  writes: PlannedWrite[],
): Record<string, unknown> | undefined {
  const scoped = writes.filter(w => w.ns === ns)
  if (scoped.length === 0) return undefined
  if (ns === 'llm-pi-ai') {
    const providers: Record<string, { models: unknown[] }> = {}
    for (const [provider, group] of groupByProvider(scoped)) {
      const sourceModels = input.llmPiAi?.providers?.[provider]?.['models']
      if (!Array.isArray(sourceModels)) continue
      const next = [...sourceModels] as Record<string, unknown>[]
      for (const write of group) {
        const entry = next[write.entryIndex]
        if (entry !== undefined && typeof entry === 'object' && !Array.isArray(entry)) {
          next[write.entryIndex] = { ...entry, contextWindow: write.contextWindow }
        }
      }
      providers[provider] = { models: next }
    }
    if (Object.keys(providers).length === 0) return undefined
    return { providers }
  }
  // llm-deepseek
  const sourceModels = input.llmDeepseek?.['models']
  if (!Array.isArray(sourceModels)) return undefined
  const next = [...sourceModels] as Record<string, unknown>[]
  for (const write of scoped) {
    const entry = next[write.entryIndex]
    if (entry !== undefined && typeof entry === 'object' && !Array.isArray(entry)) {
      next[write.entryIndex] = { ...entry, contextWindow: write.contextWindow }
    }
  }
  return { models: next }
}

function groupByProvider(writes: PlannedWrite[]): Map<string, PlannedWrite[]> {
  const groups = new Map<string, PlannedWrite[]>()
  for (const write of writes) {
    const group = groups.get(write.provider) ?? []
    group.push(write)
    groups.set(write.provider, group)
  }
  return groups
}
