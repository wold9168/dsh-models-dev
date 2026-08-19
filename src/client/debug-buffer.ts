/**
 * 调试日志缓冲：纯数据逻辑，零客户端运行时依赖（可独立单测）。
 * 「仅面板内联显示」：日志只存在于此缓冲，供面板渲染与 JSON 导出。
 */
import type { WireDebugRecord } from '../types.ts'

/** 调试缓冲的快照形状。 */
export interface ModelsDebugBuffer {
  records: WireDebugRecord[]
  /** 按 UTF-8 字节估算的当前占用（用于 maxLogMb 上限）。 */
  bytes: number
  /** 是否因超过大小限制丢弃过最早记录。 */
  truncated: boolean
}

/** 空缓冲。 */
export const EMPTY_DEBUG_BUFFER: ModelsDebugBuffer = { records: [], bytes: 0, truncated: false }

/** UTF-8 字节数（近似，用于日志大小上限）。 */
function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length
}

function recordBytes(record: WireDebugRecord): number {
  return utf8Bytes(JSON.stringify(record))
}

/**
 * 追加调试记录并按上限截断。maxLogMb < 0 表示无限制；0 视为极小的上限
 * （只保留最新一条）；正数为 MB 上限。超过上限时丢弃最早记录并标记 truncated。
 */
export function appendDebugRecords(
  buffer: ModelsDebugBuffer,
  records: readonly WireDebugRecord[],
  maxLogMb: number,
): ModelsDebugBuffer {
  if (records.length === 0) return buffer
  if (maxLogMb < 0) {
    const next = [...buffer.records, ...records]
    return {
      records: next,
      bytes: buffer.bytes + records.reduce((sum, record) => sum + recordBytes(record), 0),
      truncated: buffer.truncated,
    }
  }
  const capBytes = Math.max(0, Math.floor(maxLogMb * 1024 * 1024))
  const next = [...buffer.records, ...records]
  let bytes = next.reduce((sum, record) => sum + recordBytes(record), 0)
  let truncated = buffer.truncated
  while (bytes > capBytes && next.length > 1) {
    const dropped = next.shift()!
    bytes -= recordBytes(dropped)
    truncated = true
  }
  return { records: next, bytes, truncated }
}
