/**
 * models-sync 的 Typert wire 契约：宿主清单（typert.ts）与客户端贡献
 * （client/remote.ts）共用同一份 zod 描述。跨线只传配置与同步报告，
 * 模型数据与 settings 写回都发生在 Host。
 */
import { z } from 'zod'
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol'
import type { ModelsSyncSection, WireReport } from './types.ts'

export const sourceKindSchema = z.enum(['api', 'github', 'url'])
export const policySchema = z.enum(['mode', 'max', 'min', 'first'])
export const nsSchema = z.enum(['llm-pi-ai', 'llm-deepseek'])
export const resolveKindSchema = z.enum(['exact', 'alias', 'match'])

export const githubSchema = z.object({
  repo: z.string(),
  ref: z.string(),
  file: z.string(),
})
export const sourceSchema = z.object({
  kind: sourceKindSchema,
  url: z.string().optional(),
  github: githubSchema.optional(),
})
export const matchingSchema = z.object({
  aliases: z.record(z.string(), z.string()),
  preferredProviders: z.array(z.string()),
  policy: policySchema,
})
export const targetsSchema = z.object({
  llmPiAi: z.boolean(),
  llmDeepseek: z.boolean(),
})
export const configSchema: z.ZodType<ModelsSyncSection> = z.object({
  source: sourceSchema,
  proxy: z.string().optional(),
  matching: matchingSchema,
  targets: targetsSchema,
  debug: z.boolean().optional(),
  maxLogMb: z.number().optional(),
})

export const debugRecordSchema = z.object({
  ts: z.string(),
  level: z.enum(['info', 'warn', 'error']),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
})

export const writeSchema = z.object({
  ns: nsSchema,
  provider: z.string(),
  model: z.string(),
  contextWindow: z.number(),
  kind: resolveKindSchema,
  matchedProvider: z.string().optional(),
})
export const skipSchema = z.object({
  ns: nsSchema,
  provider: z.string(),
  model: z.string(),
  reason: z.string(),
})
export const unresolvedSchema = z.object({
  ns: nsSchema,
  provider: z.string(),
  model: z.string(),
  candidates: z.number(),
})
export const reportSchema: z.ZodType<WireReport> = z.object({
  written: z.array(writeSchema),
  skipped: z.array(skipSchema),
  unresolved: z.array(unresolvedSchema),
  errors: z.array(z.string()),
  source: z.string(),
  fetchedAt: z.string(),
  sourceModels: z.number(),
  debug: z.array(debugRecordSchema).optional(),
})

/** modelsSync 命名空间的严格调用描述符。 */
export const MODELS_SYNC_INVOCATIONS: readonly InvocationDescriptor[] = [
  {
    id: '@deepseek-ai/dsh-models-sync#modelsSync/getConfig',
    service: 'modelsSync',
    namespace: 'modelsSync',
    method: 'getConfig',
    invocation: { kind: 'direct' },
    parameters: [],
    result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-models-sync#ModelsSyncSection', schema: configSchema },
  },
  {
    id: '@deepseek-ai/dsh-models-sync#modelsSync/updateConfig',
    service: 'modelsSync',
    namespace: 'modelsSync',
    method: 'updateConfig',
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'section',
        wire: 'section',
        source: 'json',
        codec: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-models-sync#ModelsSyncSection', schema: configSchema },
      },
    ],
    result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-models-sync#ModelsSyncSection', schema: configSchema },
  },
  {
    id: '@deepseek-ai/dsh-models-sync#modelsSync/run',
    service: 'modelsSync',
    namespace: 'modelsSync',
    method: 'run',
    invocation: { kind: 'direct' },
    parameters: [],
    result: { mode: 'strict', typeSymbol: '@deepseek-ai/dsh-models-sync#WireReport', schema: reportSchema },
  },
]
