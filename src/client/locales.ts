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
  | 'matching'
  | 'policy'
  | 'policyMode'
  | 'policyMax'
  | 'policyMin'
  | 'policyFirst'
  | 'preferredProviders'
  | 'aliases'
  | 'targets'
  | 'targetPiAi'
  | 'targetDeepseek'
  | 'debug'
  | 'debugHint'
  | 'maxLogMb'
  | 'maxLogMbHint'
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
  | 'debugOff'
  | 'debugEmpty'
  | 'truncated'
  | 'exportJson'
  | 'exported'

export const zh: Record<ModelsSyncKey, string> = {
  nav: '模型数据同步 (models.dev)',
  sourceKind: '数据源',
  sourceApi: 'models.dev CDN (api.json)',
  sourceUrl: '自定义镜像 URL',
  sourceGithub: 'GitHub 仓库',
  githubRepo: '仓库（repo）',
  githubRef: '分支/引用（ref）',
  githubFile: '文件（file）',
  proxy: '代理（可选）',
  proxyHint: '留空走直连，如 http://127.0.0.1:7890',
  matching: '匹配策略',
  policy: '聚合策略',
  policyMode: '众数（mode）',
  policyMax: '最大（max）',
  policyMin: '最小（min）',
  policyFirst: '首选 provider 优先（first）',
  preferredProviders: '首选 provider（逗号分隔）',
  aliases: '供应方别名（如 scnet=openrouter，逗号分隔）',
  targets: '补全目标',
  targetPiAi: 'llm-pi-ai 的 providers',
  targetDeepseek: 'llm-deepseek 的 models',
  debug: '调试开关',
  debugHint: '打开后记录同步调试日志，仅在本面板显示并支持导出',
  maxLogMb: '日志大小限制（MB）',
  maxLogMbHint: '-1 表示无限制增长；正数表示日志最多占用的 MB 数',
  unlimited: '无限制',
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
  debugOff: '调试已关闭：不记录日志',
  debugEmpty: '暂无调试记录（打开开关后执行同步）',
  truncated: '（超出大小限制，最早的记录已被截断）',
  exportJson: '导出为 JSON 文件',
  exported: '已导出',
}

export const en: Record<ModelsSyncKey, string> = {
  nav: 'Models Sync (models.dev)',
  sourceKind: 'Source',
  sourceApi: 'models.dev CDN (api.json)',
  sourceUrl: 'Custom mirror URL',
  sourceGithub: 'GitHub repo',
  githubRepo: 'Repo',
  githubRef: 'Ref',
  githubFile: 'File',
  proxy: 'Proxy (optional)',
  proxyHint: 'Leave empty for direct; e.g. http://127.0.0.1:7890',
  matching: 'Matching',
  policy: 'Policy',
  policyMode: 'Mode (most common)',
  policyMax: 'Max',
  policyMin: 'Min',
  policyFirst: 'Preferred provider first',
  preferredProviders: 'Preferred providers (comma-separated)',
  aliases: 'Provider aliases (e.g. scnet=openrouter, comma-separated)',
  targets: 'Targets',
  targetPiAi: 'llm-pi-ai providers',
  targetDeepseek: 'llm-deepseek models',
  debug: 'Debug',
  debugHint: 'Record sync debug logs, shown here and exportable',
  maxLogMb: 'Log size limit (MB)',
  maxLogMbHint: '-1 means unlimited; a positive number caps the log size in MB',
  unlimited: 'Unlimited',
  runSync: 'Sync now',
  running: 'Syncing…',
  report: 'Sync result',
  written: 'Written',
  skipped: 'Skipped',
  unresolved: 'Unresolved',
  errors: 'Errors',
  source: 'Source',
  sourceModels: 'Source models',
  debugLog: 'Debug log',
  debugOff: 'Debug off: nothing is recorded',
  debugEmpty: 'No debug records yet (enable debug and run a sync)',
  truncated: '(over the size limit, oldest records dropped)',
  exportJson: 'Export as JSON file',
  exported: 'Exported',
}
