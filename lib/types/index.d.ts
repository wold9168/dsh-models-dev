import type { Context } from '@deepseek-ai/cordis';
import type { ModelsSyncSection } from './types.ts';
/** Cordis 插件名（Loader 入口与浏览器 bundle id）。 */
export declare const name = "models-sync";
/** 需要的服务：settings 提供命名空间，typert 注册清单。 */
export declare const inject: string[];
/**
 * 插件主体。
 * @param ctx 宿主 cordis 上下文。
 * @param config 组成行 config，作为命名空间的 base 层缺省。
 */
export declare function apply(ctx: Context, config?: Partial<ModelsSyncSection>): void;
