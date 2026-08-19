/**
 * models-sync 设置页文案（zh / en）。字典命名空间注册见 client/index.ts。
 */

/** 字典命名空间（客户端 locale 注册与槽位 locale 标识）。 */
export const NS = 'models-sync'

/** 字典键。 */
export type ModelsSyncKey =
  | 'nav'
  | 'sourceKind'
  | 'sourceApi'
  | 'sourceUrl'
  | 'sourceGithub'
  | 'githubRepo'
  | 'githubRef'
  | 'githubFile'
  | 'proxy'
  | 'proxyHint'
  | 'policy'
  | 'policyHint'
  | 'policyMode'
  | 'policyMax'
  | 'policyMin'
  | 'preferredProviders'
  | 'preferredHint'
  | 'aliases'
  | 'aliasesHint'
  | 'debug'
  | 'debugHint'
  | 'maxLogMb'
  | 'maxLogMbHint'
  | 'maxLogMbInvalid'
  | 'unlimited'
  | 'runSync'
  | 'running'
  | 'report'
  | 'written'
  | 'skipped'
  | 'unresolved'
  | 'errors'
  | 'source'
  | 'sourceModels'
  | 'debugLog'
  | 'debugLogCap'
  | 'debugOff'
  | 'debugEmpty'
  | 'truncated'
  | 'exportJson'
  | 'exported'
  | 'queryLabel'
  | 'queryHint'
  | 'queryProviderPlaceholder'
  | 'queryModelPlaceholder'
  | 'queryButton'
  | 'queryResultLabel'
  | 'queryContextWindow'
  | 'queryMaxTokens'
  | 'queryWay'
  | 'queryNotFound'
  | 'queryNotDisclosed'
  | 'kindExact'
  | 'kindAlias'
  | 'kindPreferred'
  | 'kindMatch'

export const zh: Record<ModelsSyncKey, string> = {
  nav: '模型数据同步',
  sourceKind: '数据源',
  sourceApi: 'models.dev',
  sourceUrl: '自定义镜像 URL',
  sourceGithub: 'GitHub 仓库',
  githubRepo: '仓库 (repo)',
  githubRef: '分支 (ref)',
  githubFile: '文件 (file)',
  proxy: '代理地址',
  proxyHint: '控制连接 models.dev 所使用的代理',
  policy: '聚合策略',
  policyHint: '当 settings 里的 provider 在 models.dev 上不存在、只能按模型 id 从其他 provider 匹配时，决定取哪个 provider 对应模型的 context 值。优先顺序：精确匹配 > 取值优先的 provider > 本聚合策略。',
  policyMode: '众数 —— 多数 provider 给出的值',
  policyMax: '最大 —— 按模型自身能力的最乐观值',
  policyMin: '最小 —— 按各 provider 上报的最小值，最保守',
  preferredProviders: '取值优先的 provider',
  preferredHint: '填选首选的 provider，以逗号分隔。同一模型在多个 provider 下 context 可能不同（如 openrouter 的 deepseek-v4-flash-0731 有 1310720 的 context，而在 nvidia 中有 1000000 的 context）。当列表中的 provider 持有该模型时优先采用其数据，否则按聚合策略取值。其中，顺序靠前的 provider 优先选取。',
  aliases: '供应方别名',
  aliasesHint: '把 settings 里的 provider 名映射到 models.dev 的 provider id，用于该 provider 在 models.dev 上不存在时按此名探查。例如 my-openrouter=openrouter 表示 settings 中名为 my-openrouter 的 provider，在 models.dev 上按 openrouter 查找。',
  debug: '调试',
  debugHint: '打开后记录调试日志',
  maxLogMb: '日志大小限制（单位：MB。-1 表示无空间限制）',
  maxLogMbHint: '只允许 -1 或正整数',
  maxLogMbInvalid: '输入无效：仅允许 -1（无限制）或正整数（MB）',
  unlimited: '无空间限制',
  runSync: '立即同步',
  running: '同步中…',
  report: '同步结果',
  written: '写入',
  skipped: '跳过',
  unresolved: '未命中',
  errors: '错误',
  source: '数据源',
  sourceModels: '来源模型数',
  debugLog: '调试日志',
  debugLogCap: '上限',
  debugOff: '调试已关闭：不记录日志',
  debugEmpty: '暂无调试记录（执行同步后出现）',
  truncated: '（超出大小限制，最早的记录已被截断）',
  exportJson: '导出为 JSON 文件',
  exported: '已导出',
  queryLabel: '查询 context 数据',
  queryHint: '按当前匹配配置（别名/取值优先/聚合）解析指定 provider 与模型在 models.dev 数据中的 context 与 maxTokens。',
  queryProviderPlaceholder: 'provider（如 my-openrouter）',
  queryModelPlaceholder: 'model id（如 deepseek-v4-flash-0731）',
  queryButton: '查询',
  queryResultLabel: '查询结果',
  queryContextWindow: 'contextWindow',
  queryMaxTokens: 'maxTokens',
  queryWay: '方式',
  queryNotFound: '未找到该模型',
  queryNotDisclosed: '（该 provider 未披露）',
  kindExact: '精确匹配',
  kindAlias: '别名匹配',
  kindPreferred: '取值优先',
  kindMatch: '聚合',
}

export const en: Record<ModelsSyncKey, string> = {
  nav: 'Models Sync',
  sourceKind: 'Source',
  sourceApi: 'models.dev',
  sourceUrl: 'Custom mirror URL',
  sourceGithub: 'GitHub repo',
  githubRepo: 'Repo',
  githubRef: 'Ref',
  githubFile: 'File',
  proxy: 'Proxy address',
  proxyHint: 'The proxy used to reach models.dev',
  policy: 'Aggregation policy',
  policyHint: 'When the settings provider is absent on models.dev and the model id must be matched from other providers, decides which provider\u2019s context value to take. Priority: exact match > preferred providers > this policy.',
  policyMode: 'Mode \u2014 the value most providers report',
  policyMax: 'Max \u2014 the most optimistic value by the model\u2019s own capability',
  policyMin: 'Min \u2014 the smallest value reported by any provider',
  preferredProviders: 'Preferred providers',
  preferredHint: 'Choose preferred providers, comma-separated. The same model can have different context per provider (e.g. openrouter\u2019s deepseek-v4-flash-0731 has 1310720 context, nvidia has 1000000). When one of these providers has the model, its data is preferred; otherwise the aggregation policy applies. Earlier entries take priority.',
  aliases: 'Provider aliases',
  aliasesHint: 'Map a settings provider name to a models.dev provider id, used when that provider is absent on models.dev. For example my-openrouter=openrouter means the provider named my-openrouter in settings is looked up as openrouter on models.dev.',
  debug: 'Debug',
  debugHint: 'Record debug logs when enabled',
  maxLogMb: 'Log size limit (MB. -1 means no limit)',
  maxLogMbHint: 'Only -1 or a positive integer',
  maxLogMbInvalid: 'Invalid: only -1 (unlimited) or a positive integer (MB)',
  unlimited: 'unlimited',
  runSync: 'Sync now',
  running: 'Syncing\u2026',
  report: 'Sync result',
  written: 'Written',
  skipped: 'Skipped',
  unresolved: 'Unresolved',
  errors: 'Errors',
  source: 'Source',
  sourceModels: 'Source models',
  debugLog: 'Debug log',
  debugLogCap: 'cap',
  debugOff: 'Debug off: nothing is recorded',
  debugEmpty: 'No debug records yet (run a sync)',
  truncated: '(over the size limit, oldest records dropped)',
  exportJson: 'Export as JSON file',
  exported: 'Exported',
  queryLabel: 'Query context data',
  queryHint: 'Resolve context and maxTokens for a provider and model against models.dev data using the current matching config (aliases / preferred / aggregation).',
  queryProviderPlaceholder: 'provider (e.g. my-openrouter)',
  queryModelPlaceholder: 'model id (e.g. deepseek-v4-flash-0731)',
  queryButton: 'Query',
  queryResultLabel: 'Query result',
  queryContextWindow: 'contextWindow',
  queryMaxTokens: 'maxTokens',
  queryWay: 'way',
  queryNotFound: 'model not found',
  queryNotDisclosed: '(not disclosed by this provider)',
  kindExact: 'exact match',
  kindAlias: 'alias match',
  kindPreferred: 'preferred',
  kindMatch: 'aggregated',
}
