import { describe, expect, it } from 'vitest'
import { normalize } from '../src/core/normalize.ts'
import { buildUpdatePatch, planSync } from '../src/core/plan.ts'
import type { PlanInput } from '../src/core/plan.ts'
import type { ProviderIndex } from '../src/core/types.ts'

const INDEX_FIXTURE = {
  'opencode': {
    models: {
      'big-pickle': { limit: { context: 200000 } },
      'deepseek-v4-flash-free': { limit: { context: 200000 } },
    },
  },
  'openrouter': {
    models: {
      'deepseek/deepseek-v4-flash-0731': { limit: { context: 1310720 } },
      'z-ai/glm-5': { limit: { context: 200000 } },
      'kimi/kimi-k3': { limit: { context: 1048576 } },
    },
  },
  'nvidia': {
    models: {
      'deepseek-ai/deepseek-v4-flash-0731': { limit: { context: 1000000 } },
      'deepseek-ai/deepseek-v4-pro': { limit: { context: 1048576 } },
    },
  },
}
const index: ProviderIndex = normalize(INDEX_FIXTURE)

const INPUT: PlanInput = {
  llmPiAi: {
    providers: {
      scnet: {
        api: 'openai-completions',
        baseURL: 'https://api.scnet.cn/api/llm/v1',
        models: [
          { id: 'DeepSeek-V4-Flash-0731' },
          { id: 'DeepSeek-V4-Pro' },
          { id: 'GLM-5', name: 'GLM-5', maxTokens: 64000 },
          { id: 'Kimi-K3', contextWindow: 1048576 },
          { id: 'no-such-model' },
        ],
      },
      opencode: {
        models: [
          { id: 'deepseek-v4-flash-free', contextWindow: 200000 },
          { id: 'big-pickle' },
        ],
      },
      nvidia: {},
    },
  },
  llmDeepseek: {
    models: [
      { id: 'deepseek-v4-pro' },
    ],
  },
}

const TARGETS = { llmPiAi: true, llmDeepseek: true }

describe('planSync', () => {
  it('只补缺失 contextWindow 的条目', () => {
    const { writes, skipped, unresolved } = planSync(INPUT, index, {}, TARGETS)
    const ids = writes.map(w => `${w.ns}:${w.provider}:${w.model}`)
    expect(ids).toContain('llm-pi-ai:scnet:DeepSeek-V4-Flash-0731')
    expect(ids).toContain('llm-pi-ai:scnet:DeepSeek-V4-Pro')
    expect(ids).toContain('llm-pi-ai:scnet:GLM-5')
    expect(ids).toContain('llm-pi-ai:opencode:big-pickle')
    expect(ids).toContain('llm-deepseek:deepseek-official:deepseek-v4-pro')
    expect(writes).toHaveLength(5)
    expect(skipped).toHaveLength(2)
    expect(unresolved).toHaveLength(1)
  })
  it('已设置 contextWindow 的条目跳过，不覆盖', () => {
    const { skipped } = planSync(INPUT, index, {}, TARGETS)
    const kimi = skipped.find(s => s.model === 'Kimi-K3')
    expect(kimi?.reason).toBe('已设置 contextWindow')
    const flash = skipped.find(s => s.model === 'deepseek-v4-flash-free')
    expect(flash?.reason).toBe('已设置 contextWindow')
  })
  it('保留模型条目的其他字段（name/maxTokens）', () => {
    const { writes } = planSync(INPUT, index, {}, TARGETS)
    const glm = writes.find(w => w.model === 'GLM-5')!
    expect(glm.entryIndex).toBe(2)
    const patch = buildUpdatePatch('llm-pi-ai', INPUT, [glm])!
    const scnet = (patch['providers'] as Record<string, { models: Record<string, unknown>[] }>)['scnet']!
    const entry = scnet.models[2]!
    expect(entry).toMatchObject({ id: 'GLM-5', name: 'GLM-5', maxTokens: 64000, contextWindow: 200000 })
  })
  it('未命中条目进入 unresolved', () => {
    const { unresolved } = planSync(INPUT, index, {}, TARGETS)
    expect(unresolved[0]?.model).toBe('no-such-model')
  })
  it('目标命名空间可单独关闭', () => {
    const { writes } = planSync(INPUT, index, {}, { llmPiAi: true, llmDeepseek: false })
    expect(writes.every(w => w.ns === 'llm-pi-ai')).toBe(true)
  })
})

describe('buildUpdatePatch', () => {
  it('llm-pi-ai 补丁按 provider 组，只替换被触碰 provider 的 models', () => {
    const { writes } = planSync(INPUT, index, {}, TARGETS)
    const patch = buildUpdatePatch('llm-pi-ai', INPUT, writes)!
    const providers = patch['providers'] as Record<string, unknown>
    expect(Object.keys(providers).sort()).toEqual(['opencode', 'scnet'])
    const scnetModels = (providers['scnet'] as { models: Record<string, unknown>[] }).models
    expect(scnetModels[0]!).toEqual({ id: 'DeepSeek-V4-Flash-0731', contextWindow: 1310720 })
    expect(scnetModels[1]!).toEqual({ id: 'DeepSeek-V4-Pro', contextWindow: 1048576 })
    expect(scnetModels[3]!).toEqual({ id: 'Kimi-K3', contextWindow: 1048576 }) // 已有值原样保留
  })
  it('llm-deepseek 补丁替换 models 数组', () => {
    const { writes } = planSync(INPUT, index, {}, TARGETS)
    const patch = buildUpdatePatch('llm-deepseek', INPUT, writes)!
    expect(patch['models']).toEqual([{ id: 'deepseek-v4-pro', contextWindow: 1048576 }])
  })
  it('无写入时返回 undefined', () => {
    expect(buildUpdatePatch('llm-pi-ai', INPUT, [])).toBeUndefined()
  })
})
