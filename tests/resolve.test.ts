import { describe, expect, it } from 'vitest'
import { normalize } from '../src/core/normalize.ts'
import { normalizeModelId, resolveContext } from '../src/core/resolve.ts'
import type { ProviderIndex } from '../src/core/types.ts'

const API_FIXTURE = {
  'opencode': {
    models: {
      'deepseek-v4-flash-free': { limit: { context: 200000 } },
      'big-pickle': { limit: { context: 200000 } },
    },
  },
  'openrouter': {
    models: {
      'deepseek/deepseek-v4-flash-0731': { limit: { context: 1310720 } },
      'deepseek/deepseek-v4-pro': { limit: { context: 1048576 } },
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
const index: ProviderIndex = normalize(API_FIXTURE)

describe('normalizeModelId', () => {
  it('小写并去掉非字母数字', () => {
    expect(normalizeModelId('DeepSeek-V4-Flash-0731')).toBe('deepseekv4flash0731')
    expect(normalizeModelId('nvidia/nemotron-3-ultra-550b-a55b:free')).toBe('nvidianemotron3ultra550ba55bfree')
  })
})

describe('resolveContext 精确路径', () => {
  it('精确 (provider, modelId) 命中', () => {
    const r = resolveContext(index, 'opencode', 'deepseek-v4-flash-free', {})
    expect(r?.kind).toBe('exact')
    expect(r?.contextWindow).toBe(200000)
  })
  it('同 provider 内按归一化命中（大小写/分隔符差异）', () => {
    const r = resolveContext(index, 'opencode', 'DeepSeek-V4-Flash-Free', {})
    expect(r?.kind).toBe('exact')
    expect(r?.contextWindow).toBe(200000)
  })
  it('无歧义归一化时单命中生效', () => {
    const r = resolveContext(index, 'openrouter', 'DeepSeek-V4-Pro', {})
    expect(r?.kind).toBe('exact')
    expect(r?.contextWindow).toBe(1048576)
  })
})

describe('resolveContext alias 路径', () => {
  it('alias 映射后命中', () => {
    const r = resolveContext(index, 'scnet', 'DeepSeek-V4-Flash-0731', { aliases: { scnet: 'nvidia' } })
    expect(r?.kind).toBe('alias')
    expect(r?.matchedProvider).toBe('nvidia')
    expect(r?.contextWindow).toBe(1000000)
  })
  it('alias 指向的 provider 未命中时继续回退', () => {
    const r = resolveContext(index, 'scnet', 'DeepSeek-V4-Flash-0731', { aliases: { scnet: 'ghost' } })
    expect(r?.kind).toBe('match') // 落到 model-id 回退
  })
})

describe('resolveContext 模型 id 跨 provider 回退', () => {
  it('默认 mode：候选唯一值即取其值', () => {
    const r = resolveContext(index, 'scnet', 'DeepSeek-V4-Flash-0731', {})
    expect(r?.kind).toBe('match')
    expect(r?.matchedProvider).toBe('openrouter') // 平局取先出现者
    expect(r?.contextWindow).toBe(1310720)
  })
  it('policy max 取最大', () => {
    const r = resolveContext(index, 'scnet', 'DeepSeek-V4-Flash-0731', { policy: 'max' })
    expect(r?.contextWindow).toBe(1310720)
  })
  it('policy min 取最小', () => {
    const r = resolveContext(index, 'scnet', 'DeepSeek-V4-Flash-0731', { policy: 'min' })
    expect(r?.contextWindow).toBe(1000000)
  })
  it('policy first 按 preferredProviders 排序', () => {
    const r = resolveContext(index, 'scnet', 'DeepSeek-V4-Flash-0731', {
      policy: 'first',
      preferredProviders: ['nvidia', 'openrouter'],
    })
    expect(r?.matchedProvider).toBe('nvidia')
    expect(r?.contextWindow).toBe(1000000)
  })
  it('policy mode 以 preferredProviders 打破平局', () => {
    const r = resolveContext(index, 'scnet', 'DeepSeek-V4-Flash-0731', {
      policy: 'mode',
      preferredProviders: ['nvidia'],
    })
    expect(r?.contextWindow).toBe(1000000)
  })
})

describe('resolveContext 未命中', () => {
  it('空归一化 id 不匹配', () => {
    expect(resolveContext(index, 'opencode', '---', {})).toBeUndefined()
  })
  it('完全不存在的模型返回 undefined', () => {
    expect(resolveContext(index, 'scnet', 'jinaai/jina-embeddings-v5-omni-small', {})).toBeUndefined()
  })
})
