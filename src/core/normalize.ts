/**
 * models.dev 数据归一化：识别 api.json 与 GitHub 仓库 models.json 两种格式，
 * 统一成 (provider, modelId) -> ModelData 的索引。
 *
 * - api.json（CDN / catalog.json 的 providers 部分）：`{ provider: { models: { id: { limit: { context, output } } } } }`
 * - GitHub 仓库签入的 models.json：扁平列表 `[{ id: "org/model", context_length, ... }]`，
 *   或 `{ data: [...] }` 包装；id 首段按 provider 维度近似。
 */
import type { ModelData, ProviderIndex } from './types.ts'

/** 一个普通对象（非 null、非数组）。 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 正整数；非正整数返回 undefined。 */
function positiveInt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) return undefined
  return value
}

/** 从 api.json 的 limit 表取能力数据。 */
function modelData(limit: Record<string, unknown>): ModelData | undefined {
  const context = positiveInt(limit['context'])
  if (context === undefined) return undefined
  const out: ModelData = { contextWindow: context }
  const output = positiveInt(limit['output'])
  if (output !== undefined) out.maxOutput = output
  return out
}

/** 归一化 api.json 格式。 */
function normalizeApiJson(root: Record<string, unknown>): ProviderIndex {
  const index: ProviderIndex = new Map()
  for (const [providerId, provider] of Object.entries(root)) {
    if (!isObject(provider)) continue
    const models = provider['models']
    if (!isObject(models)) continue
    const perProvider = new Map<string, ModelData>()
    for (const [modelId, model] of Object.entries(models)) {
      if (!isObject(model)) continue
      const limit = isObject(model['limit']) ? model['limit'] : {}
      const data = modelData(limit)
      if (data !== undefined) perProvider.set(modelId, data)
    }
    if (perProvider.size > 0) index.set(providerId, perProvider)
  }
  return index
}

/** 归一化 GitHub 仓库 models.json 格式（扁平列表 / { data: [...] }）。 */
function normalizeGithubJson(root: unknown): ProviderIndex {
  const list: unknown[] = Array.isArray(root)
    ? root
    : isObject(root) && Array.isArray(root['data'])
      ? root['data'] as unknown[]
      : []
  const index: ProviderIndex = new Map()
  for (const entry of list) {
    if (!isObject(entry)) continue
    const id = typeof entry['id'] === 'string' ? entry['id'] : undefined
    const context = positiveInt(entry['context_length'])
    if (id === undefined || context === undefined) continue
    const slash = id.indexOf('/')
    const providerId = slash === -1 ? id : id.slice(0, slash)
    const modelId = slash === -1 ? id : id.slice(slash + 1)
    if (providerId.length === 0 || modelId.length === 0) continue
    const perProvider = index.get(providerId) ?? new Map<string, ModelData>()
    // 同一 id 重复出现时首个胜出（条目可能去重不彻底）。
    if (!perProvider.has(modelId)) perProvider.set(modelId, { contextWindow: context })
    index.set(providerId, perProvider)
  }
  return index
}

/** 检测数据源格式。 */
export function detectFormat(root: unknown): 'api' | 'github' | undefined {
  if (Array.isArray(root)) {
    if (root.length > 0 && isObject(root[0]) && 'id' in root[0] && 'context_length' in root[0]) return 'github'
    return undefined
  }
  if (!isObject(root)) return undefined
  if (Array.isArray(root['data']) && root['data'].length > 0
    && isObject(root['data'][0]) && 'id' in root['data'][0] && 'context_length' in root['data'][0]) {
    return 'github'
  }
  for (const value of Object.values(root)) {
    if (isObject(value) && isObject(value['models'])) return 'api'
  }
  return undefined
}

/**
 * 归一化任意来源文档为统一索引。无法识别的格式返回空索引（调用方据此报错）。
 */
export function normalize(root: unknown): ProviderIndex {
  const format = detectFormat(root)
  if (format === 'api' && isObject(root)) return normalizeApiJson(root)
  if (format === 'github') return normalizeGithubJson(root)
  return new Map()
}

/** 索引中的模型条数（用于报告）。 */
export function countModels(index: ProviderIndex): number {
  let total = 0
  for (const perProvider of index.values()) total += perProvider.size
  return total
}
