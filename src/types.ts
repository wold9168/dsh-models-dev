/**
 * 插件共享类型：宿主配置分区（models-sync 命名空间）与跨线报告形状。
 * 这里只放 JSON 兼容的普通数据；核心逻辑见 src/core。
 */
import type { ResolveKind } from './core/types.ts'

/** 数据源选择（默认 api）。 */
export interface WireSource {
  kind: 'api' | 'github' | 'url'
  /** kind 为 url 时必填；kind 为 api 时可选覆盖。 */
  url?: string
  /** kind 为 github 时的镜像参数。 */
  github?: { repo: string; ref: string; file: string }
}

/** 匹配配置（默认值已由 schema 填入）。 */
export interface WireMatching {
  aliases: Record<string, string>
  preferredProviders: string[]
  policy: 'mode' | 'max' | 'min' | 'first'
}

/** 要补全的命名空间开关（默认都开）。 */
export interface WireTargets {
  llmPiAi: boolean
  llmDeepseek: boolean
}

/** models-sync 命名空间分区形状 = 客户端看到的完整配置（默认已填）。 */
export interface ModelsSyncSection {
  source: WireSource
  proxy?: string
  matching: WireMatching
  targets: WireTargets
  /** 调试开关：打开后记录同步调试日志（仅面板内联显示与导出）。 */
  debug?: boolean
  /** 日志大小限制（MB）：-1 不限，正数=上限。 */
  maxLogMb?: number
}

/** 一条调试记录（wire 版）。 */
export interface WireDebugRecord {
  ts: string
  level: 'info' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

/** 一条已写入记录（wire 版，去掉内部 entryIndex）。 */
export interface WireWrite {
  ns: 'llm-pi-ai' | 'llm-deepseek'
  provider: string
  model: string
  contextWindow: number
  kind: ResolveKind
  matchedProvider?: string
}

/** 跳过条目。 */
export interface WireSkip {
  ns: 'llm-pi-ai' | 'llm-deepseek'
  provider: string
  model: string
  reason: string
}

/** 未命中条目。 */
export interface WireUnresolved {
  ns: 'llm-pi-ai' | 'llm-deepseek'
  provider: string
  model: string
  candidates: number
}

/** 同步报告（wire 版）。 */
export interface WireReport {
  written: WireWrite[]
  skipped: WireSkip[]
  unresolved: WireUnresolved[]
  errors: string[]
  source: string
  fetchedAt: string
  sourceModels: number
  /** 调试记录（仅开关打开时携带）。 */
  debug?: WireDebugRecord[]
}
