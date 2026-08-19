/**
 * Host 侧同步编排：取数 -> 归一化 -> 计划 -> 写回 settings（仅 llm-pi-ai）。
 *
 * 通过依赖注入的 SettingsAccess 使用 settings 服务，因此本模块不依赖 DSH
 * 包即可独立单测；真正的 `ctx.settings` 适配在运行时接线。
 * 传 options.onDebug 时在关键步骤发出调试记录（仅开关打开时收集）。
 */
import type { DebugRecord, SyncConfig, SyncReport } from '../core/types.ts';
/** ctx.settings 的最小结构切片：读用户层、合并写回。 */
export interface SettingsAccess {
    /** 命名空间的原始用户层（describe().user），无则 undefined。 */
    user(ns: string): Record<string, unknown> | undefined;
    /** 把合并补丁写入命名空间的用户层。 */
    update(ns: string, patch: Record<string, unknown>): Promise<void>;
}
/** 一次同步的输入。 */
export interface SyncRunOptions {
    now?: string;
    timeoutMs?: number;
    /** 调试记录接收器；传入即开启调试采集。 */
    onDebug?: (record: DebugRecord) => void;
}
/**
 * 执行一次完整同步：拉取 -> 归一化 -> 计划 -> 合并写回 llm-pi-ai。
 * 网络或数据源错误记入报告 errors，不中断已解析的部分。
 */
export declare function syncViaSettings(settings: SettingsAccess, config: SyncConfig, options?: SyncRunOptions): Promise<SyncReport>;
