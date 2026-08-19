/**
 * models-sync 设置命名空间：数据源、代理与匹配策略，由设置面板编辑。
 * 注册在 settings 服务上（applies: live），运行时每次读最新值。
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings'
import type { ModelsSyncSection } from './types.ts'

/** 命名空间名（web 允许列表须与此一致）。 */
export const MODELS_SYNC_NAMESPACE = settingsNamespace('models-sync')

/** schemastery schema：设置面板据此渲染，缺省值在 schema 内（嵌套对象给完整默认）。 */
export const ModelsSyncSectionSchema: z<ModelsSyncSection> = z.object({
  source: z.object({
    kind: z.union(['api', 'github', 'url']).default('api'),
    url: z.string().default(''),
    github: z.object({
      repo: z.string().default('anomalyco/models.dev'),
      ref: z.string().default('dev'),
      file: z.string().default('models.json'),
    }).default({ repo: 'anomalyco/models.dev', ref: 'dev', file: 'models.json' }),
  }).default({ kind: 'api', url: '', github: { repo: 'anomalyco/models.dev', ref: 'dev', file: 'models.json' } }),
  proxy: z.string(),
  matching: z.object({
    aliases: z.dict(z.string()).default({}),
    preferredProviders: z.array(z.string()).default([]),
    policy: z.union(['mode', 'max', 'min', 'first']).default('mode'),
  }).default({ aliases: {}, preferredProviders: [], policy: 'mode' }),
  targets: z.object({
    llmPiAi: z.boolean().default(true),
    llmDeepseek: z.boolean().default(true),
  }).default({ llmPiAi: true, llmDeepseek: true }),
  debug: z.boolean().default(false),
  maxLogMb: z.number().default(2),
})

/**
 * 注册命名空间并返回 owner scope。schema 缺省值作为最底层，组成行的
 * config 作为 base，用户分区覆盖其上。
 */
export function registerModelsSyncSettings(
  ctx: Context,
  base?: Partial<ModelsSyncSection>,
): SettingsScope<ModelsSyncSection> {
  return ctx.settings.register(MODELS_SYNC_NAMESPACE, ModelsSyncSectionSchema, {
    base: base ?? {},
    applies: 'live',
  })
}
