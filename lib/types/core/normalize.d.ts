/**
 * models.dev 数据归一化：识别 api.json 与 GitHub 仓库 models.json 两种格式，
 * 统一成 (provider, modelId) -> ModelData 的索引。
 *
 * - api.json（CDN / catalog.json 的 providers 部分）：`{ provider: { models: { id: { limit: { context, output } } } } }`
 * - GitHub 仓库签入的 models.json：扁平列表 `[{ id: "org/model", context_length, ... }]`，
 *   或 `{ data: [...] }` 包装；id 首段按 provider 维度近似。
 */
import type { ProviderIndex } from './types.ts';
/** 检测数据源格式。 */
export declare function detectFormat(root: unknown): 'api' | 'github' | undefined;
/**
 * 归一化任意来源文档为统一索引。无法识别的格式返回空索引（调用方据此报错）。
 */
export declare function normalize(root: unknown): ProviderIndex;
/** 索引中的模型条数（用于报告）。 */
export declare function countModels(index: ProviderIndex): number;
