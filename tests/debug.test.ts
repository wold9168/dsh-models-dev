import { describe, expect, it } from 'vitest'
import { appendDebugRecords, EMPTY_DEBUG_BUFFER } from '../src/client/debug-buffer.ts'
import type { ModelsDebugBuffer } from '../src/client/debug-buffer.ts'
import type { WireDebugRecord } from '../src/types.ts'

function record(message: string, size = 100): WireDebugRecord {
  return { ts: '2026-01-01T00:00:00.000Z', level: 'info', message: message.padEnd(size, 'x') }
}

const empty: ModelsDebugBuffer = EMPTY_DEBUG_BUFFER

describe('appendDebugRecords', () => {
  it('关闭状态（不调用）自然不产生记录', () => {
    expect(empty.records).toHaveLength(0)
    expect(empty.bytes).toBe(0)
  })
  it('maxLogMb < 0 时无限制追加', () => {
    const one = appendDebugRecords(empty, [record('a')], -1)
    const two = appendDebugRecords(one, [record('b')], -1)
    expect(two.records.map(r => r.message[0])).toEqual(['a', 'b'])
    expect(two.truncated).toBe(false)
  })
  it('正数上限超限时丢弃最早记录并标记 truncated', () => {
    const cap = 0.0005 // 约 500 字节，不足以容纳全部
    let buffer = empty
    for (let i = 0; i < 10; i += 1) buffer = appendDebugRecords(buffer, [record(`m${String(i)}`)], cap)
    expect(buffer.records.length).toBeGreaterThan(0)
    expect(buffer.records.length).toBeLessThan(10)
    expect(buffer.truncated).toBe(true)
    expect(buffer.bytes).toBeLessThanOrEqual(1024 * 1024 * 0.0005 + 1000)
  })
  it('空记录列表原样返回', () => {
    const one = appendDebugRecords(empty, [record('a')], 1)
    expect(appendDebugRecords(one, [], 1)).toBe(one)
  })
  it('上限内保留全部', () => {
    const big = appendDebugRecords(empty, [record('a'), record('b')], 100)
    expect(big.records).toHaveLength(2)
    expect(big.truncated).toBe(false)
  })
})
