/**
 * 宿主运行服务：modelsSync Typert 命名空间的实现。配置读写经 owner scope
 * （live 生效），同步执行复用 src/integration/host-sync.ts 的核心编排。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SettingsNamespace, SettingsScope } from '@deepseek-ai/dsh-settings'
import { syncViaSettings } from './integration/host-sync.ts'
import type { SettingsAccess } from './integration/host-sync.ts'
import type { DebugRecord, SyncConfig } from './core/types.ts'
import type { ModelsSyncSection, WireReport, WireWrite, WireSkip, WireUnresolved } from './types.ts'

/** 把分区配置转成核心 SyncConfig。 */
export function toCoreConfig(section: ModelsSyncSection): SyncConfig {
  return {
    source: section.source,
    ...section.proxy === undefined ? {} : { proxy: section.proxy },
    matching: section.matching,
    targets: section.targets,
  }
}

/** 把核心报告映射成 wire 报告（去掉内部字段）。 */
function toWireReport(
  report: {
    written: Array<{ ns: 'llm-pi-ai' | 'llm-deepseek'; provider: string; model: string; contextWindow: number; kind: 'exact' | 'alias' | 'match'; matchedProvider?: string }>
    skipped: Array<{ ns: 'llm-pi-ai' | 'llm-deepseek'; provider: string; model: string; reason: string }>
    unresolved: Array<{ ns: 'llm-pi-ai' | 'llm-deepseek'; provider: string; model: string; candidates: number }>
    errors: string[]
    source: string
    fetchedAt: string
    sourceModels: number
  },
  debug?: DebugRecord[],
): WireReport {
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

/** modelsSync 命名空间服务。 */
export class ModelsSyncRuntime {
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
}
