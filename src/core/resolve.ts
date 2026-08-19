/**
 * (provider, modelId) 键解析：精确 -> alias 映射 -> 模型 id 归一化跨 provider 回退。
 *
 * 身份键始终是 (settings 供应方, 模型 id)；回退只在精确键不在 models.dev 时发生
 * （例如 scnet 这类自建网关，models.dev 并无对应条目）。同一模型在不同 provider
 * 下的 context 可以相差很大，因此回退必须按可配置策略聚合，不能用死值。
 */
import type { MatchingConfig, ProviderIndex, ResolvedContext } from './types.ts'

/** 小写并去掉所有非字母数字字符。 */
export function normalizeModelId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** 该 provider 下归一化后等于 `norm` 的模型 id（精确 id 或末段均计入）。 */
function idsByNorm(perProvider: Map<string, unknown>, norm: string): string[] {
  const out: string[] = []
  for (const key of perProvider.keys()) {
    if (normalizeModelId(key) === norm || normalizeModelId(key.split('/').pop() ?? '') === norm) {
      out.push(key)
    }
  }
  return out
}

/** 一个回退候选：提供者、context 值、出现顺序。 */
interface Candidate {
  provider: string
  contextWindow: number
  order: number
}

/** 按策略聚合候选；preferredProviders 为 'first' 排序与 'mode' 平局所用。 */
function aggregate(candidates: Candidate[], config: MatchingConfig): ResolvedContext {
  const preferred = config.preferredProviders ?? []
  const prefIndex = (provider: string): number => {
    const i = preferred.indexOf(provider)
    return i === -1 ? preferred.length : i
  }
  if (config.policy === 'max') {
    const best = candidates.reduce((a, b) => (b.contextWindow > a.contextWindow ? b : a))
    return { contextWindow: best.contextWindow, kind: 'match', matchedProvider: best.provider }
  }
  if (config.policy === 'min') {
    const best = candidates.reduce((a, b) => (b.contextWindow < a.contextWindow ? b : a))
    return { contextWindow: best.contextWindow, kind: 'match', matchedProvider: best.provider }
  }
  if (config.policy === 'first') {
    const sorted = [...candidates].sort(
      (a, b) => prefIndex(a.provider) - prefIndex(b.provider) || a.order - b.order,
    )
    const best = sorted[0]!
    return { contextWindow: best.contextWindow, kind: 'match', matchedProvider: best.provider }
  }
  // mode：众数；平局按 preferred 顺序、再按首次出现次序。
  const byValue = new Map<number, Candidate[]>()
  for (const candidate of candidates) {
    const group = byValue.get(candidate.contextWindow) ?? []
    group.push(candidate)
    byValue.set(candidate.contextWindow, group)
  }
  let bestGroup: Candidate[] | undefined
  for (const group of byValue.values()) {
    if (bestGroup === undefined) {
      bestGroup = group
      continue
    }
    if (group.length > bestGroup.length) {
      bestGroup = group
      continue
    }
    if (group.length === bestGroup.length) {
      const a = bestGroup[0]!
      const b = group[0]!
      const aPref = prefIndex(a.provider)
      const bPref = prefIndex(b.provider)
      if (bPref < aPref || (bPref === aPref && b.order < a.order)) bestGroup = group
    }
  }
  const top = bestGroup![0]!
  return { contextWindow: top.contextWindow, kind: 'match', matchedProvider: top.provider }
}

/** 在一个 provider 的模型表里做精确/归一化命中。 */
function lookupInProvider(
  perProvider: Map<string, { contextWindow: number; maxOutput?: number }> | undefined,
  model: string,
  kind: ResolveContextKind,
  matchedProvider?: string,
): ResolvedContext | undefined {
  if (perProvider === undefined) return undefined
  const exact = perProvider.get(model)
  if (exact !== undefined) {
    return { contextWindow: exact.contextWindow, kind, ...matchedProvider === undefined ? {} : { matchedProvider } }
  }
  const norm = normalizeModelId(model)
  if (norm.length === 0) return undefined
  const within = idsByNorm(perProvider, norm)
  if (within.length === 1) {
    const data = perProvider.get(within[0]!)
    if (data !== undefined) {
      return { contextWindow: data.contextWindow, kind, ...matchedProvider === undefined ? {} : { matchedProvider } }
    }
  }
  return undefined
}

type ResolveContextKind = 'exact' | 'alias'

/**
 * 解析一条 settings (provider, model) 条目缺省的 contextWindow。
 *
 * 顺序：1) 供应方精确/归一化命中；2) alias 映射后的供应方命中；3) 模型 id
 * 跨 provider 回退 + 聚合策略。都未命中返回 undefined。
 */
export function resolveContext(
  index: ProviderIndex,
  provider: string,
  model: string,
  config: MatchingConfig,
): ResolvedContext | undefined {
  // 1) 供应方精确命中（含同 provider 内的归一化）。
  const direct = lookupInProvider(index.get(provider), model, 'exact')
  if (direct !== undefined) return direct

  // 2) alias 映射（settings 供应方 -> models.dev provider id）。
  const alias = config.aliases?.[provider]
  if (alias !== undefined && alias !== provider) {
    const aliased = lookupInProvider(index.get(alias), model, 'alias', alias)
    if (aliased !== undefined) return aliased
  }

  // 3) 模型 id 归一化跨 provider 回退。
  const norm = normalizeModelId(model)
  if (norm.length === 0) return undefined
  const candidates: Candidate[] = []
  const seen = new Set<string>()
  let order = 0
  for (const [pid, models] of index) {
    for (const [key, data] of models) {
      const matched = normalizeModelId(key) === norm || normalizeModelId(key.split('/').pop() ?? '') === norm
      if (!matched) continue
      const dedupeKey = `${pid}:${String(data.contextWindow)}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      candidates.push({ provider: pid, contextWindow: data.contextWindow, order: order++ })
    }
  }
  if (candidates.length === 0) return undefined
  return aggregate(candidates, config)
}
