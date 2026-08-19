/**
 * models-sync 设置页：数据源/代理/匹配策略配置、查询 context 数据、手动同步触发、
 * 同步结果，以及「仅面板内联」的调试日志（含导出为 JSON 文件）。
 *
 * hooks 组件注入：inject face 的 `hooks.scope` / `hooks.debug` 由 slot 运行
 * 时绑定为 `useScope` / `useDebug` 选择器钩子（见 InjectFace 语义）。
 */
import { type ReactElement } from 'react';
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ModelsSyncSection as Section, WireQueryResult, WireReport } from '../types.ts';
import type { ModelsDebugBuffer } from './debug-buffer.ts';
/** 客户端缺省配置（与宿主 schema 缺省一致，供首帧渲染与导出兜底）。 */
export declare function defaultSection(): Section;
/** 注入面：hooks 组件绑定为 useScope/useDebug，其余成员直通。 */
export interface ModelsSyncSectionInjected {
    hooks: {
        scope: HostObservable<{
            value: Section;
        }>;
        debug: HostObservable<{
            value: ModelsDebugBuffer;
        }>;
    };
    updateConfig: (section: Section) => Promise<void>;
    run: () => Promise<WireReport>;
    query: (provider: string, model: string) => Promise<WireQueryResult>;
}
/** 完整组件 props：运行时份额 + 注入面 + 文案座位。 */
export type ModelsSyncSectionProps = PropsRuntime<'settings.section'> & InjectFace<ModelsSyncSectionInjected> & PropsLocale<'models-sync'>;
/** 渲染设置页。 */
export declare function ModelsSyncSection({ useScope, useDebug, updateConfig, run, query, t }: ModelsSyncSectionProps): import("react").JSX.Element;
export type ModelsSyncSectionElement = ReactElement;
