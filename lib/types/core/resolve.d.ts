/**
 * (provider, modelId) 键解析：精确 -> alias 映射 -> 模型 id 归一化跨 provider 回退。
 *
 * 身份键始终是 (settings 供应方, 模型 id)；回退只在精确键不在 models.dev 时发生
 * （例如 scnet 这类自建网关，models.dev 并无对应条目）。同一模型在不同 provider
 * 下的 context 可以相差很大，因此回退必须按可配置策略聚合，不能用死值。
 */
import type { MatchingConfig, ProviderIndex, ResolvedContext } from './types.ts';
/** 小写并去掉所有非字母数字字符。 */
export declare function normalizeModelId(id: string): string;
/**
 * 解析一条 settings (provider, model) 条目缺省的 contextWindow。
 *
 * 顺序：1) 供应方精确/归一化命中；2) alias 映射后的供应方命中；3) 模型 id
 * 跨 provider 回退 + 聚合策略。都未命中返回 undefined。
 */
export declare function resolveContext(index: ProviderIndex, provider: string, model: string, config: MatchingConfig): ResolvedContext | undefined;
