/**
 * (provider, modelId) 键解析。解析优先级：
 *
 *  1) provider 与 model 精确匹配（含别名解析后）；
 *  2) 取值优先的 provider（按列表顺序）持有该 model；
 *  3) 按聚合策略（mode/max/min）聚合。
 *
 * 身份键始终是 (settings 里的 provider, 模型 id)。回退只在精确键不在
 * models.dev 时发生（例如 scnet 这类自建网关，models.dev 并无对应条目）。
 */
import type { MatchingConfig, ProviderIndex, ResolvedContext } from './types.ts'

/** 小写并去掉所有非字母数字字符。 */
export function normalizeModelId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** 在一个 provider 的模型表里找 model：精确，或归一化单命中（歧义返回 undefined）。 */
function findIn(
  perProvider: Map<string, { contextWindow: number; maxOutput?: number }> | undefined,
  model: string,
  norm: string,
): { contextWindow: number; maxOutput?: number } | undefined {
  if (perProvider === undefined) return undefined
  const exact = perProvider.get(model)
  if (exact !== undefined) return exact
  if (norm.length === 0) return undefined
  let hit: string | undefined
  for (const key of perProvider.keys()) {
    if (normalizeModelId(key) === norm || normalizeModelId(key.split('/').pop() ?? '') === norm) {
      if (hit !== undefined) return undefined // 歧义：交给后续层级
      hit = key
    }
  }
  return hit === undefined ? undefined : perProvider.get(hit)
}

/** 取某 provider 下该 model 的解析结果（含 maxTokens，kind 由调用方标注）。 */
function entryOf(
  index: ProviderIndex,
  pid: string,
  model: string,
  norm: string,
): Omit<ResolvedContext, 'kind'> | undefined {
  const entry = findIn(index.get(pid), model, norm)
  if (entry === undefined) return undefined
  return {
    contextWindow: entry.contextWindow,
    ...entry.maxOutput === undefined ? {} : { maxTokens: entry.maxOutput },
    matchedProvider: pid,
  }
}

/** 一个回退候选：提供者、context 值、maxOutput、出现顺序。 */
interface Candidate {
  provider: string
  contextWindow: number
  maxOutput?: number
  order: number
}

/** 按聚合策略选一个候选。 */
function aggregate(candidates: Candidate[], policy: string): Candidate | undefined {
  if (policy === 'max') {
    return candidates.reduce((a, b) => (b.contextWindow > a.contextWindow ? b : a))
  }
  if (policy === 'min') {
    return candidates.reduce((a, b) => (b.contextWindow < a.contextWindow ? b : a))
  }
  // mode：众数；平局取先出现者。
  const byValue = new Map<number, Candidate[]>()
  for (const candidate of candidates) {
    const group = byValue.get(candidate.contextWindow) ?? []
    group.push(candidate)
    byValue.set(candidate.contextWindow, group)
  }
  let bestGroup: Candidate[] | undefined
  for (const group of byValue.values()) {
    if (bestGroup === undefined || group.length > bestGroup.length) bestGroup = group
    else if (group.length === bestGroup.length && group[0]!.order < bestGroup[0]!.order) bestGroup = group
  }
  return bestGroup?.[0]
}

/**
 * 解析一条 settings (provider, model) 条目缺省的 contextWindow。
 * 都未命中返回 undefined。
 */
export function resolveContext(
  index: ProviderIndex,
  provider: string,
  model: string,
  config: MatchingConfig,
): ResolvedContext | undefined {
  const aliases = config.aliases ?? {}
  const preferred = config.preferredProviders ?? []
  const norm = normalizeModelId(model)

  // 1) 精确匹配：先试别名解析后的 provider（settings 名为 B 的按 A 探查），再试自身。
  const alias = aliases[provider]
  if (alias !== undefined && alias !== provider && index.has(alias)) {
    const r = entryOf(index, alias, model, norm)
    if (r !== undefined) return { ...r, kind: 'alias' }
  }
  if (index.has(provider)) {
    const r = entryOf(index, provider, model, norm)
    if (r !== undefined) return { ...r, kind: 'exact' }
  }
  // 2) 取值优先的 provider：按列表顺序取第一个持有该 model 的。
  for (const pid of preferred) {
    const r = entryOf(index, pid, model, norm)
    if (r !== undefined) return { ...r, kind: 'preferred' }
  }
  // 3) 聚合策略。
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
      candidates.push({ provider: pid, contextWindow: data.contextWindow, maxOutput: data.maxOutput, order: order++ })
    }
  }
  if (candidates.length === 0) return undefined
  const chosen = aggregate(candidates, config.policy ?? 'mode')
  if (chosen === undefined) return undefined
  return {
    contextWindow: chosen.contextWindow,
    ...chosen.maxOutput === undefined ? {} : { maxTokens: chosen.maxOutput },
    kind: 'match',
    matchedProvider: chosen.provider,
  }
}
