import { describe, expect, it } from 'vitest'
import { countModels, detectFormat, normalize } from '../src/core/normalize.ts'

const API_FIXTURE = {
  'opencode': {
    id: 'opencode',
    models: {
      'deepseek-v4-flash-free': { id: 'deepseek-v4-flash-free', limit: { context: 200000, output: 128000 } },
      'big-pickle': { id: 'big-pickle', limit: { context: 200000 } },
    },
  },
  'openrouter': {
    id: 'openrouter',
    models: {
      'deepseek/deepseek-v4-flash-0731': { id: 'deepseek/deepseek-v4-flash-0731', limit: { context: 1310720, output: 393216 } },
    },
  },
  // 没有 models 的 provider 应被跳过
  'broken-provider': { id: 'broken-provider' },
}

describe('detectFormat', () => {
  it('识别 api.json 结构', () => {
    expect(detectFormat(API_FIXTURE)).toBe('api')
  })
  it('识别 GitHub 扁平列表结构', () => {
    expect(detectFormat([{ id: 'deepseek/deepseek-v4-flash', context_length: 1048576 }])).toBe('github')
  })
  it('识别 GitHub { data: [...] } 包装结构', () => {
    expect(detectFormat({ data: [{ id: 'deepseek/deepseek-v4-flash', context_length: 1048576 }] })).toBe('github')
  })
  it('无法识别时返回 undefined', () => {
    expect(detectFormat({ foo: 1 })).toBeUndefined()
    expect(detectFormat(42)).toBeUndefined()
    expect(detectFormat(null)).toBeUndefined()
  })
})

describe('normalize api.json', () => {
  it('按 (provider, modelId) 建立索引并提取 limit.context', () => {
    const index = normalize(API_FIXTURE)
    expect(index.get('opencode')?.get('deepseek-v4-flash-free')?.contextWindow).toBe(200000)
    expect(index.get('opencode')?.get('deepseek-v4-flash-free')?.maxOutput).toBe(128000)
    expect(index.get('openrouter')?.get('deepseek/deepseek-v4-flash-0731')?.contextWindow).toBe(1310720)
  })
  it('跳过无 models 的 provider', () => {
    const index = normalize(API_FIXTURE)
    expect(index.has('broken-provider')).toBe(false)
  })
  it('跳过无有效 context 的模型条目', () => {
    const index = normalize({
      p: { models: {
        'a': { id: 'a', limit: { context: '1000' } },
        'b': { id: 'b', limit: { output: 100 } },
        'c': { id: 'c', limit: { context: -5 } },
      } },
    })
    expect(index.get('p')?.size ?? 0).toBe(0)
  })
})

describe('normalize github models.json', () => {
  it('将 org/model 拆成 (provider, model) 键', () => {
    const index = normalize([
      { id: 'deepseek/deepseek-v4-flash', context_length: 1048576 },
      { id: 'tencent/hy3-preview', context_length: 256000 },
      { id: 'no-slash-model', context_length: 100000 },
    ])
    expect(index.get('deepseek')?.get('deepseek-v4-flash')?.contextWindow).toBe(1048576)
    expect(index.get('tencent')?.get('hy3-preview')?.contextWindow).toBe(256000)
    expect(index.get('no-slash-model')?.get('no-slash-model')?.contextWindow).toBe(100000)
  })
  it('支持 { data: [...] } 包装', () => {
    const index = normalize({ data: [{ id: 'deepseek/deepseek-v4-flash', context_length: 1048576 }] })
    expect(index.get('deepseek')?.get('deepseek-v4-flash')?.contextWindow).toBe(1048576)
  })
  it('跳过缺 id 或 context_length 的条目', () => {
    const index = normalize([
      { id: 'deepseek/deepseek-v4-flash' },
      { context_length: 1048576 },
      { id: '', context_length: 1048576 },
    ])
    expect(countModels(index)).toBe(0)
  })
})

describe('countModels', () => {
  it('统计全部 provider 的模型条数', () => {
    const index = normalize(API_FIXTURE)
    expect(countModels(index)).toBe(3)
  })
})

describe('normalize 兜底', () => {
  it('无法识别的输入返回空索引', () => {
    expect(countModels(normalize({ foo: 1 }))).toBe(0)
    expect(countModels(normalize(null))).toBe(0)
    expect(countModels(normalize([]))).toBe(0)
  })
})
