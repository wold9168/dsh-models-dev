/**
 * dsh-models-sync 客户端插件：浏览器半区。挂载 modelsSync Remote 命名空间，
 * 维护配置快照与「仅面板内联」的调试日志缓冲（受 maxLogMb 大小限制，开关
 * 关闭不记录），并注册 settings.section 设置页。
 */
// Type-only：带来 ctx.remote 的 Context merge 与转发事件面。
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only：带来 ctx.locale 的 Context merge。
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only：带来 settings.section 的 SlotMap 声明。
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { createSnapshotStore, type ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { MODELS_SYNC_REMOTE } from './remote.ts'
import {
  ModelsSyncSection,
  defaultSection,
  type ModelsSyncSectionInjected,
} from './ModelsSyncSection.tsx'
import { appendDebugRecords, EMPTY_DEBUG_BUFFER } from './debug-buffer.ts'
import type { ModelsDebugBuffer } from './debug-buffer.ts'
import { NS, en, zh, type ModelsSyncKey } from './locales.ts'
import type { ModelsSyncSection as Section, WireReport } from '../types.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** models-sync 设置页文案。 */
    'models-sync': ModelsSyncKey
  }
}

export { NS } from './locales.ts'
export type { ModelsDebugBuffer } from './debug-buffer.ts'

/** 需要的服务。 */
export const inject = ['remote', 'slots', 'locale']

/** modelsSync 命名空间服务面（wire 返回形状）。 */
interface ModelsSyncNamespaceFace {
  getConfig(): Promise<{ ok: true; value: Section } | { ok: false; error: { code: string; message: string } }>
  updateConfig(section: Section): Promise<{ ok: true; value: Section } | { ok: false; error: { code: string; message: string } }>
  run(): Promise<{ ok: true; value: WireReport } | { ok: false; error: { code: string; message: string } }>
}

/**
 * 注册设置页并接线。
 * @param ctx 客户端根上下文。
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'models-sync: 文案字典')

  const configStore = createSnapshotStore<{ value: Section }>({ value: defaultSection() })
  const debugStore = createSnapshotStore<{ value: ModelsDebugBuffer }>({ value: EMPTY_DEBUG_BUFFER })

  let modelsSync: ModelsSyncNamespaceFace | undefined

  const loadConfig = async (): Promise<void> => {
    const remote = modelsSync
    if (remote === undefined) return
    const result = await remote.getConfig()
    if (!result.ok) {
      console.error(`[models-sync] 读取配置失败: ${result.error.code}: ${result.error.message}`)
      return
    }
    configStore.set({ value: result.value })
  }

  const updateConfig = async (section: Section): Promise<void> => {
    const remote = modelsSync
    if (remote === undefined) throw new Error('modelsSync Remote 未挂载')
    const result = await remote.updateConfig(section)
    if (!result.ok) throw new Error(`保存配置失败: ${result.error.code}: ${result.error.message}`)
    configStore.set({ value: result.value })
  }

  const run = async (): Promise<WireReport> => {
    const remote = modelsSync
    if (remote === undefined) throw new Error('modelsSync Remote 未挂载')
    const result = await remote.run()
    if (!result.ok) throw new Error(`同步失败: ${result.error.code}: ${result.error.message}`)
    const report = result.value
    // 仅调试开关打开时记录日志；关闭则不占用任何资源。
    const section = configStore.getSnapshot().value
    if (section.debug === true && report.debug !== undefined && report.debug.length > 0) {
      const maxLogMb = section.maxLogMb ?? 2
      debugStore.set({ value: appendDebugRecords(debugStore.getSnapshot().value, report.debug, maxLogMb) })
    }
    return report
  }

  ctx.effect(async () => {
    const dispose = await ctx.remote.$mount(MODELS_SYNC_REMOTE)
    modelsSync = (ctx.reflect as unknown as { get(name: string): unknown })
      .get('remote.modelsSync') as ModelsSyncNamespaceFace | undefined
    if (modelsSync === undefined) {
      throw new Error('models-sync: modelsSync Remote 未挂载')
    }
    await loadConfig()
    return () => {
      modelsSync = undefined
      void dispose()
    }
  }, 'models-sync: remote')

  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'models-sync',
    order: 50,
    label: () => t('nav'),
    locale: NS,
    inject: (): ModelsSyncSectionInjected => ({
      hooks: { scope: configStore, debug: debugStore },
      updateConfig,
      run,
    }),
  }, ModelsSyncSection))
}
