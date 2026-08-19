/**
 * 宿主运行服务：modelsSync Typert 命名空间的实现。配置读写经 owner scope
 * （live 生效），同步执行复用 src/integration/host-sync.ts 的核心编排，
 * 查询复用同一套匹配配置并带数据源索引缓存。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SettingsScope } from '@deepseek-ai/dsh-settings';
import type { SyncConfig } from './core/types.ts';
import type { ModelsSyncSection, WireQueryResult, WireReport } from './types.ts';
/** 把分区配置转成核心 SyncConfig。 */
export declare function toCoreConfig(section: ModelsSyncSection): SyncConfig;
/** modelsSync 命名空间服务。 */
export declare class ModelsSyncRuntime {
    private readonly ctx;
    private readonly scope;
    private cache;
    constructor(ctx: Context, scope: SettingsScope<ModelsSyncSection>);
    /** 当前解析后的配置（缺省已填）。 */
    getConfig(): ModelsSyncSection;
    /** 整体替换配置分区，返回新解析值。 */
    updateConfig(section: ModelsSyncSection): Promise<ModelsSyncSection>;
    /** 执行一次同步，返回 wire 报告；调试开关打开时携带调试记录。 */
    run(): Promise<WireReport>;
    /** 按当前匹配配置查询指定 provider + 模型的 context 与 maxTokens。 */
    query(request: {
        provider: string;
        model: string;
    }): Promise<WireQueryResult>;
    /** 拉取并缓存数据源索引；同一源不重复拉取。 */
    private loadIndex;
}
