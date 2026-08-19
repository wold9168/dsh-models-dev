/**
 * 同步计划器：遍历用户 settings 文档（llm-pi-ai / llm-deepseek 命名空间的原始
 * 用户层），对缺省 contextWindow 的模型条目逐一解析，产出：
 * - writes：应补入 contextWindow 的条目（含 entryIndex，供叶子级写回定位）；
 * - skipped：跳过原因（已显式设置、id 缺失等）；
 * - unresolved：任何来源都未命中的条目。
 *
 * 只补缺失值：已有 contextWindow 的条目一律跳过，绝不覆盖用户显式设置。
 */
import type { MatchingConfig, PlannedWrite, ProviderIndex, SkippedEntry, UnresolvedEntry } from './types.ts';
/** 各命名空间的用户文档形状（宽松，允许任意 provider 字段）。 */
export interface PlanInput {
    llmPiAi?: {
        providers?: Record<string, Record<string, unknown>>;
    };
    llmDeepseek?: {
        models?: unknown;
    };
}
export interface PlanResult {
    writes: PlannedWrite[];
    skipped: SkippedEntry[];
    unresolved: UnresolvedEntry[];
}
/** 生成同步计划。 */
export declare function planSync(input: PlanInput, index: ProviderIndex, matching: MatchingConfig, targets: {
    llmPiAi: boolean;
    llmDeepseek: boolean;
}): PlanResult;
/**
 * 由计划写出一份 `settings.update` 合并补丁：对象深合并、数组整体替换，所以
 * 补丁里被触碰的 provider 只携带替换后的 `models`，其它字段与命名空间不动。
 */
export declare function buildUpdatePatch(ns: 'llm-pi-ai' | 'llm-deepseek', input: PlanInput, writes: PlannedWrite[]): Record<string, unknown> | undefined;
