/**
 * 客户端 Typert Remote 贡献：把 modelsSync 命名空间挂到 ctx.remote.modelsSync。
 * 描述符与宿主清单共用 MODELS_SYNC_INVOCATIONS，两边保持同一 wire 定义。
 */
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import type { ModelsSyncSection, WireReport } from '../types.ts';
/** modelsSync 命名空间的客户端贡献。 */
export declare const MODELS_SYNC_REMOTE: TypertRemoteContribution;
declare module '@deepseek-ai/dsh-typert-protocol' {
    /** modelsSync 命名空间的类型面。 */
    interface TypertRemoteNamespace$6d6f64656c7353796e63 {
        getConfig: () => Promise<RemoteResult<ModelsSyncSection>>;
        updateConfig: (section: ModelsSyncSection) => Promise<RemoteResult<ModelsSyncSection>>;
        run: () => Promise<RemoteResult<WireReport>>;
    }
    interface TypertRemoteMap {
        'modelsSync/getConfig': () => Promise<RemoteResult<ModelsSyncSection>>;
        'modelsSync/updateConfig': (section: ModelsSyncSection) => Promise<RemoteResult<ModelsSyncSection>>;
        'modelsSync/run': () => Promise<RemoteResult<WireReport>>;
    }
    interface TypertRemoteNamespaceMap {
        modelsSync: TypertRemoteNamespace$6d6f64656c7353796e63;
    }
}
