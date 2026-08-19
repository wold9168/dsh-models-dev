/**
 * 宿主运行服务：modelsSync Typert 命名空间的实现。配置读写经 owner scope
 * （live 生效），同步执行复用 src/integration/host-sync.ts 的核心编排，
 * 查询复用同一套匹配配置并带数据源索引缓存。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SettingsNamespace, SettingsScope } from '@deepseek-ai/dsh-settings'
import { fetchJson, sourceUrl } from './core/fetch.ts'
import { countModels, normalize } from './core/normalize.ts'
import { resolveContext } from './core/resolve.ts'
import { syncViaSettings } from './integration/host-sync.ts'
import type { SettingsAccess } from './integration/host-sync.ts'
import type { DebugRecord, SyncConfig, SyncReport } from './core/types.ts'
import type { ModelsSyncSection, WireQueryResult, WireReport, WireWrite, WireSkip, WireUnresolved } from './types.ts'

/** 把分区配置转成核心 SyncConfig。 */
export function toCoreConfig(section: ModelsSyncSection): SyncConfig {
  return {
    source: section.source,
    ...section.proxy === undefined ? {} : { proxy: section.proxy },
    matching: section.matching,
  }
}

/** 把核心报告映射成 wire 报告（去掉内部字段）。 */
function toWireReport(report: SyncReport, debug?: DebugRecord[]): WireReport {
  return {
    written: report.written.map(write => ({
      ns: write.ns,
      provider: write.provider,
      model: write.model,
      contextWindow: write.contextWindow,
      kind: write.kind,
      ...write.matchedProvider === undefined ? {} : { matchedProvider: write.matchedProvider },
    })) satisfies WireWrite[],
    skipped: report.skipped.map(skip => ({ ns: skip.ns, provider: skip.provider, model: skip.model, reason: skip.reason })) satisfies WireSkip[],
    unresolved: report.unresolved.map(miss => ({ ns: miss.ns, provider: miss.provider, model: miss.model, candidates: miss.candidates })) satisfies WireUnresolved[],
    errors: [...report.errors],
    source: report.source,
    fetchedAt: report.fetchedAt,
    sourceModels: report.sourceModels,
    ...debug === undefined ? {} : { debug },
  }
}

/** 数据源索引缓存（查询复用，避免每次查询都重新拉取）。 */
interface IndexCache {
  index: Map<string, Map<string, { contextWindow: number; maxOutput?: number }>>
  source: string
  sourceModels: number
  fetchedAt: string
}

/** modelsSync 命名空间服务。 */
export class ModelsSyncRuntime {
  private cache: IndexCache | null = null

  constructor(
    private readonly ctx: Context,
    private readonly scope: SettingsScope<ModelsSyncSection>,
  ) {}

  /** 当前解析后的配置（缺省已填）。 */
  getConfig(): ModelsSyncSection {
    return this.scope.get()
  }

  /** 整体替换配置分区，返回新解析值。 */
  async updateConfig(section: ModelsSyncSection): Promise<ModelsSyncSection> {
    await this.scope.replace(section)
    return this.scope.get()
  }

  /** 执行一次同步，返回 wire 报告；调试开关打开时携带调试记录。 */
  async run(): Promise<WireReport> {
    const section = this.scope.get()
    const access: SettingsAccess = {
      user: (ns) => {
        const descriptor = this.ctx.settings.describe({ redactSecrets: true })
          .find(d => d.ns === ns)
        return descriptor?.user as Record<string, unknown> | undefined
      },
      update: (ns, patch) => this.ctx.settings.update(ns as SettingsNamespace, patch),
    }
    const debug: DebugRecord[] = []
    const report = await syncViaSettings(access, toCoreConfig(section), {
      onDebug: section.debug === true ? (record) => { debug.push(record) } : undefined,
    })
    return toWireReport(report, section.debug === true ? debug : undefined)
  }

  /** 按当前匹配配置查询指定 provider + 模型的 context 与 maxTokens。 */
  async query(request: { provider: string; model: string }): Promise<WireQueryResult> {
    const section = this.scope.get()
    const source = sourceUrl(section.source)
    const provider = typeof request?.provider === 'string' ? request.provider : ''
    const model = typeof request?.model === 'string' ? request.model : ''
    if (provider.length === 0 || model.length === 0) {
      return { found: false, reason: 'provider 与 model 均不能为空', source }
    }
    try {
      const cache = await this.loadIndex(section)
      const resolved = resolveContext(cache.index, provider, model, section.matching)
      if (resolved === undefined) {
        return { found: false, reason: '未找到该模型', source: cache.source, fetchedAt: cache.fetchedAt }
      }
      return {
        found: true,
        contextWindow: resolved.contextWindow,
        ...resolved.maxTokens === undefined ? {} : { maxTokens: resolved.maxTokens },
        kind: resolved.kind,
        ...resolved.matchedProvider === undefined ? {} : { matchedProvider: resolved.matchedProvider },
        source: cache.source,
        fetchedAt: cache.fetchedAt,
      }
    } catch (error) {
      return { found: false, reason: error instanceof Error ? error.message : String(error), source }
    }
  }

  /** 拉取并缓存数据源索引；同一源不重复拉取。 */
  private async loadIndex(section: ModelsSyncSection): Promise<IndexCache> {
    const source = sourceUrl(section.source)
    if (this.cache !== null && this.cache.source === source) return this.cache
    const raw = await fetchJson(source, section.proxy)
    const index = normalize(raw)
    this.cache = { index, source, sourceModels: countModels(index), fetchedAt: new Date().toISOString() }
    return this.cache
  }
}
