/**
 * models-sync 设置命名空间：数据源、代理与匹配策略，由设置面板编辑。
 * 注册在 settings 服务上（applies: live），运行时每次读最新值。
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type SettingsScope } from '@deepseek-ai/dsh-settings';
import type { ModelsSyncSection } from './types.ts';
/** 命名空间名（web 允许列表须与此一致）。 */
export declare const MODELS_SYNC_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** schemastery schema：设置面板据此渲染，缺省值在 schema 内（嵌套对象给完整默认）。 */
export declare const ModelsSyncSectionSchema: z<ModelsSyncSection>;
/**
 * 注册命名空间并返回 owner scope。schema 缺省值作为最底层，组成行的
 * config 作为 base，用户分区覆盖其上。
 */
export declare function registerModelsSyncSettings(ctx: Context, base?: Partial<ModelsSyncSection>): SettingsScope<ModelsSyncSection>;
