/**
 * modelsSync 命名空间的手写宿主 Typert 清单：与客户端贡献共用 MODELS_SYNC_INVOCATIONS。
 * 经 ctx.typert.register 挂到严格注册表，Host Gateway 据此解析端点。
 */
import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry/types'
import { MODELS_SYNC_INVOCATIONS } from './contract.ts'

/** modelsSync 命名空间的宿主清单。 */
export const TYPERT_MANIFEST: TypertContribution = {
  package: '@deepseek-ai/dsh-models-sync',
  face: 'host',
  schemas: [],
  model: {
    services: [
      {
        key: 'modelsSync',
        exportName: 'ModelsSyncRuntime',
        description: '从 models.dev 拉取模型数据并按 (provider, modelId) 键补全缺失 contextWindow。',
        tags: [],
        members: [
          { kind: 'method', name: 'getConfig', signature: 'getConfig(): ModelsSyncSection' },
          { kind: 'method', name: 'updateConfig', signature: 'updateConfig(section: ModelsSyncSection): Promise<ModelsSyncSection>' },
          { kind: 'method', name: 'run', signature: 'run(): Promise<WireReport>' },
          { kind: 'method', name: 'query', signature: 'query(request: QueryRequest): Promise<WireQueryResult>' },
        ],
        types: [],
      },
    ],
    events: [],
    objects: [],
  },
  invocations: MODELS_SYNC_INVOCATIONS,
}
