import type { SyncSourceConfig } from './types.ts';
/** 由源配置解析实际 URL。 */
export declare function sourceUrl(source: SyncSourceConfig): string;
/**
 * 拉取并解析 JSON。
 * @param url 数据源 URL。
 * @param proxy HTTP(S) 代理 URL；空/缺省走直连。
 * @param timeoutMs 请求超时。
 */
export declare function fetchJson(url: string, proxy: string | undefined, timeoutMs?: number): Promise<unknown>;
