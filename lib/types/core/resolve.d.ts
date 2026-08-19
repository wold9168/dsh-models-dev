/**
 * (provider, modelId) 键解析。解析优先级：
 *
 *  1) provider 与 model 精确匹配（含别名解析后）；
 *  2) 取值优先的 provider（按列表顺序）持有该 model；
 *  3) 按聚合策略（mode/max/min）聚合。
 *
 * 身份键始终是 (settings 里的 provider, 模型 id)。回退只在精确键不在
 * models.dev 时发生（例如 scnet 这类自建网关，models.dev 并无对应条目）。
 */
import type { MatchingConfig, ProviderIndex, ResolvedContext } from './types.ts';
/** 小写并去掉所有非字母数字字符。 */
export declare function normalizeModelId(id: string): string;
/**
 * 解析一条 settings (provider, model) 条目缺省的 contextWindow。
 * 都未命中返回 undefined。
 */
export declare function resolveContext(index: ProviderIndex, provider: string, model: string, config: MatchingConfig): ResolvedContext | undefined;
