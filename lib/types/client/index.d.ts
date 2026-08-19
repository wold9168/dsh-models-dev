import { type ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type ModelsSyncKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** models-sync 设置页文案。 */
        'models-sync': ModelsSyncKey;
    }
}
export { NS } from './locales.ts';
export type { ModelsDebugBuffer } from './debug-buffer.ts';
/** 需要的服务。 */
export declare const inject: string[];
/**
 * 注册设置页并接线。
 * @param ctx 客户端根上下文。
 */
export declare function apply(ctx: ClientContext): void;
