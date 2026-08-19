/**
 * models-sync 的 Typert wire 契约：宿主清单（typert.ts）与客户端贡献
 * （client/remote.ts）共用同一份 zod 描述。跨线只传配置、同步报告与查询结果，
 * 模型数据与 settings 写回都发生在 Host。
 */
import { z } from 'zod';
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol';
import type { ModelsSyncSection, WireQueryResult, WireReport } from './types.ts';
export declare const sourceKindSchema: z.ZodEnum<{
    api: "api";
    github: "github";
    url: "url";
}>;
export declare const policySchema: z.ZodEnum<{
    mode: "mode";
    max: "max";
    min: "min";
}>;
export declare const nsSchema: z.ZodLiteral<"llm-pi-ai">;
export declare const resolveKindSchema: z.ZodEnum<{
    exact: "exact";
    alias: "alias";
    preferred: "preferred";
    match: "match";
}>;
export declare const githubSchema: z.ZodObject<{
    repo: z.ZodString;
    ref: z.ZodString;
    file: z.ZodString;
}, z.core.$strip>;
export declare const sourceSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        api: "api";
        github: "github";
        url: "url";
    }>;
    url: z.ZodOptional<z.ZodString>;
    github: z.ZodOptional<z.ZodObject<{
        repo: z.ZodString;
        ref: z.ZodString;
        file: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const matchingSchema: z.ZodObject<{
    aliases: z.ZodRecord<z.ZodString, z.ZodString>;
    preferredProviders: z.ZodArray<z.ZodString>;
    policy: z.ZodEnum<{
        mode: "mode";
        max: "max";
        min: "min";
    }>;
}, z.core.$strip>;
export declare const configSchema: z.ZodType<ModelsSyncSection>;
export declare const debugRecordSchema: z.ZodObject<{
    ts: z.ZodString;
    level: z.ZodEnum<{
        info: "info";
        warn: "warn";
        error: "error";
    }>;
    message: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const writeSchema: z.ZodObject<{
    ns: z.ZodLiteral<"llm-pi-ai">;
    provider: z.ZodString;
    model: z.ZodString;
    contextWindow: z.ZodNumber;
    kind: z.ZodEnum<{
        exact: "exact";
        alias: "alias";
        preferred: "preferred";
        match: "match";
    }>;
    matchedProvider: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const skipSchema: z.ZodObject<{
    ns: z.ZodLiteral<"llm-pi-ai">;
    provider: z.ZodString;
    model: z.ZodString;
    reason: z.ZodString;
}, z.core.$strip>;
export declare const unresolvedSchema: z.ZodObject<{
    ns: z.ZodLiteral<"llm-pi-ai">;
    provider: z.ZodString;
    model: z.ZodString;
    candidates: z.ZodNumber;
}, z.core.$strip>;
export declare const reportSchema: z.ZodType<WireReport>;
/** 查询请求：provider + model id。 */
export declare const queryRequestSchema: z.ZodObject<{
    provider: z.ZodString;
    model: z.ZodString;
}, z.core.$strip>;
export declare const queryResultSchema: z.ZodType<WireQueryResult>;
/** modelsSync 命名空间的严格调用描述符。 */
export declare const MODELS_SYNC_INVOCATIONS: readonly InvocationDescriptor[];
