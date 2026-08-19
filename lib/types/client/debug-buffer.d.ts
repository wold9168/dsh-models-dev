/**
 * 调试日志缓冲：纯数据逻辑，零客户端运行时依赖（可独立单测）。
 * 「仅面板内联显示」：日志只存在于此缓冲，供面板渲染与 JSON 导出。
 */
import type { WireDebugRecord } from '../types.ts';
/** 调试缓冲的快照形状。 */
export interface ModelsDebugBuffer {
    records: WireDebugRecord[];
    /** 按 UTF-8 字节估算的当前占用（用于 maxLogMb 上限）。 */
    bytes: number;
    /** 是否因超过大小限制丢弃过最早记录。 */
    truncated: boolean;
}
/** 空缓冲。 */
export declare const EMPTY_DEBUG_BUFFER: ModelsDebugBuffer;
/**
 * 追加调试记录并按上限截断。maxLogMb < 0 表示无限制；0 视为极小的上限
 * （只保留最新一条）；正数为 MB 上限。超过上限时丢弃最早记录并标记 truncated。
 */
export declare function appendDebugRecords(buffer: ModelsDebugBuffer, records: readonly WireDebugRecord[], maxLogMb: number): ModelsDebugBuffer;
