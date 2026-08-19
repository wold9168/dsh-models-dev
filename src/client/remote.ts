/**
 * 客户端 Typert Remote 贡献：把 modelsSync 命名空间挂到 ctx.remote.modelsSync。
 * 描述符与宿主清单共用 MODELS_SYNC_INVOCATIONS，两边保持同一 wire 定义。
 */
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import { MODELS_SYNC_INVOCATIONS } from '../contract.ts'
import type { ModelsSyncSection, WireQueryResult, WireReport } from '../types.ts'

/** modelsSync 命名空间的客户端贡献。 */
export const MODELS_SYNC_REMOTE: TypertRemoteContribution = {
  package: '@deepseek-ai/dsh-models-sync',
  descriptors: MODELS_SYNC_INVOCATIONS,
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  // 注：运行时访问不走 `ctx.remote.modelsSync` 点读，而是通过
  // `ctx.reflect.get('remote.modelsSync')`（见 client/index.ts）。
  /** modelsSync 命名空间的类型面。 */
  interface TypertRemoteNamespace$6d6f64656c7353796e63 {
    getConfig: () => Promise<RemoteResult<ModelsSyncSection>>
    updateConfig: (section: ModelsSyncSection) => Promise<RemoteResult<ModelsSyncSection>>
    run: () => Promise<RemoteResult<WireReport>>
    query: (request: { provider: string; model: string }) => Promise<RemoteResult<WireQueryResult>>
  }
  interface TypertRemoteMap {
    'modelsSync/getConfig': () => Promise<RemoteResult<ModelsSyncSection>>
    'modelsSync/updateConfig': (section: ModelsSyncSection) => Promise<RemoteResult<ModelsSyncSection>>
    'modelsSync/run': () => Promise<RemoteResult<WireReport>>
    'modelsSync/query': (request: { provider: string; model: string }) => Promise<RemoteResult<WireQueryResult>>
  }
  interface TypertRemoteNamespaceMap {
    modelsSync: TypertRemoteNamespace$6d6f64656c7353796e63
  }
}
