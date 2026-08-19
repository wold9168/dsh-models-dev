/**
 * dsh-models-sync 宿主插件：注册 models-sync 设置命名空间、挂载 modelsSync
 * Typert 远程服务（配置读写 + 手动触发同步），并注册严格清单。客户端半区
 * 同包提供（./client），web 服务器在 /plugins/.../client.js 下供给。
 *
 * 同步核心逻辑（取数/归一化/匹配/写回）在 src/core 与 src/integration/host-sync.ts，
 * 纯函数并已单测；本入口只做 ctx.settings 适配与 RPC 接线。
 */
// Type-only：带来 ctx.settings 与 ctx.typert 的 Context merge。
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-typert-registry'
import type { Context } from '@deepseek-ai/cordis'
import { registerModelsSyncSettings } from './settings.ts'
import { ModelsSyncRuntime } from './runtime.ts'
import { TYPERT_MANIFEST } from './typert.ts'
import type { ModelsSyncSection } from './types.ts'

/** Cordis 插件名（Loader 入口与浏览器 bundle id）。 */
export const name = 'models-sync'

/** 需要的服务：settings 提供命名空间，typert 注册清单。 */
export const inject = ['settings', 'typert']

/**
 * 插件主体。
 * @param ctx 宿主 cordis 上下文。
 * @param config 组成行 config，作为命名空间的 base 层缺省。
 */
export function apply(ctx: Context, config?: Partial<ModelsSyncSection>): void {
  const scope = registerModelsSyncSettings(ctx, config)
  new ModelsSyncRuntime(ctx, scope)
  ctx.effect(() => {
    const dispose = ctx.typert.register(TYPERT_MANIFEST)
    return () => { void dispose() }
  }, 'models-sync: typert manifest')
}
