/**
 * 共享类型：models.dev 上下文窗口同步特性的数据形状。
 *
 * 核心层（src/core）零依赖：这里只有普通 JSON 兼容数据与纯函数签名，
 * Host/CLI/DSH 集成都在核心层之上组合这些形状。
 */

/** 一个模型的能力数据（来自 models.dev）。 */
export interface ModelData {
  /** 请求+响应合计上下文容量，单位 token。 */
  contextWindow: number
  /** 输出 token 上限，来源披露时给出。 */
  maxOutput?: number
}

/**
 * 归一化后的 models.dev 索引，键为 (provider, modelId) —— 正是本插件
 * 补全 settings 条目所用的身份键。Map 嵌套避免 JSON 进入热查找路径；
 * 序列化交给调用方。
 */
export type ProviderIndex = Map<string, Map<string, ModelData>>

/** 数据源选择。 */
export interface SyncSourceConfig {
  /** 'api' = models.dev CDN api.json；'github' = GitHub 仓库 raw 文件；'url' = 任意镜像 URL。 */
  kind: 'api' | 'github' | 'url'
  /** 显式 URL，kind 为 'url' 时必填；kind 为 'api' 时可作覆盖。 */
  url?: string
  /** GitHub 镜像参数，kind 为 'github' 时使用。 */
  github?: { repo: string; ref: string; file: string }
}

/** model-id 回退匹配的聚合策略。 */
export type MatchPolicy = 'mode' | 'max' | 'min' | 'first'

/** 匹配配置。 */
export interface MatchingConfig {
  /** settings 供应方名 -> models.dev provider id，在 model-id 回退之前尝试。 */
  aliases?: Record<string, string>
  /** 'first' 策略与 'mode' 平局时偏好的 provider 顺序。 */
  preferredProviders?: string[]
  /** model-id 回退聚合策略，默认 'mode'。 */
  policy?: MatchPolicy
}

/** 同步要补全的 settings 命名空间；两者都默认开启。 */
export interface SyncTargets {
  llmPiAi?: boolean
  llmDeepseek?: boolean
}

export interface SyncConfig {
  source: SyncSourceConfig
  /** HTTP(S) 代理 URL；空/缺省走直连。 */
  proxy?: string
  matching?: MatchingConfig
  targets?: SyncTargets
}

/** 一条 settings 条目如何拿到上下文窗口。 */
export type ResolveKind = 'exact' | 'alias' | 'match'

/** 一条 settings (provider, model) 条目的解析结果。 */
export interface ResolvedContext {
  contextWindow: number
  kind: ResolveKind
  /** 提供该值的 models.dev provider（'match' 时给出）。 */
  matchedProvider?: string
}

/** 计划写入 settings 文档的一条记录。 */
export interface PlannedWrite {
  ns: 'llm-pi-ai' | 'llm-deepseek'
  /** llm-pi-ai 的 provider 路由名；llm-deepseek 恒为 'deepseek-official'。 */
  provider: string
  model: string
  /** 该条目在其 models 数组中的位置，供 CLI 叶子级写回定位。 */
  entryIndex: number
  contextWindow: number
  kind: ResolveKind
  matchedProvider?: string
}

/** 同步放过的条目。 */
export interface SkippedEntry {
  ns: 'llm-pi-ai' | 'llm-deepseek'
  provider: string
  model: string
  reason: string
}

/** 任何来源都未能解析的条目。 */
export interface UnresolvedEntry {
  ns: 'llm-pi-ai' | 'llm-deepseek'
  provider: string
  model: string
  candidates: number
}

export interface SyncReport {
  written: PlannedWrite[]
  skipped: SkippedEntry[]
  unresolved: UnresolvedEntry[]
  errors: string[]
  /** 实际使用的数据源 URL。 */
  source: string
  fetchedAt: string
  /** 归一化索引里的模型条数。 */
  sourceModels: number
}

/** 一条调试记录（设置面板内联显示 + JSON 导出）。 */
export interface DebugRecord {
  ts: string
  level: 'info' | 'warn' | 'error'
  message: string
  /** 可选的附加结构数据，供 JSON 导出使用。 */
  data?: Record<string, unknown>
}
