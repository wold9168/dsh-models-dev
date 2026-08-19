/**
 * models-sync 设置页文案（zh / en）。字典命名空间注册见 client/index.ts。
 */
/** 字典命名空间（客户端 locale 注册与槽位 locale 标识）。 */
export declare const NS = "models-sync";
/** 字典键。 */
export type ModelsSyncKey = 'nav' | 'sourceKind' | 'sourceApi' | 'sourceUrl' | 'sourceGithub' | 'githubRepo' | 'githubRef' | 'githubFile' | 'proxy' | 'proxyHint' | 'policy' | 'policyHint' | 'policyMode' | 'policyMax' | 'policyMin' | 'preferredProviders' | 'preferredHint' | 'aliases' | 'aliasesHint' | 'debug' | 'debugHint' | 'maxLogMb' | 'maxLogMbHint' | 'maxLogMbInvalid' | 'unlimited' | 'runSync' | 'running' | 'report' | 'written' | 'skipped' | 'unresolved' | 'errors' | 'source' | 'sourceModels' | 'debugLog' | 'debugLogCap' | 'debugOff' | 'debugEmpty' | 'truncated' | 'exportJson' | 'exported' | 'queryLabel' | 'queryHint' | 'queryProviderPlaceholder' | 'queryModelPlaceholder' | 'queryButton' | 'queryResultLabel' | 'queryContextWindow' | 'queryMaxTokens' | 'queryWay' | 'queryNotFound' | 'queryNotDisclosed' | 'kindExact' | 'kindAlias' | 'kindPreferred' | 'kindMatch';
export declare const zh: Record<ModelsSyncKey, string>;
export declare const en: Record<ModelsSyncKey, string>;
