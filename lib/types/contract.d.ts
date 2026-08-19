/**
 * models-sync 的 Typert wire 契约：宿主清单（typert.ts）与客户端贡献
 * （client/remote.ts）共用同一份 zod 描述。跨线只传配置与同步报告，
 * 模型数据与 settings 写回都发生在 Host。
 */
import { z } from 'zod';
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol';
import type { ModelsSyncSection, WireReport } from './types.ts';
export declare const sourceKindSchema: z.ZodEnum<{
    api: "api";
    github: "github";
    url: "url";
}>;
export declare const policySchema: z.ZodEnum<{
    mode: "mode";
    max: "max";
    min: "min";
    first: "first";
}>;
export declare const nsSchema: z.ZodEnum<{
    "llm-pi-ai": "llm-pi-ai";
    "llm-deepseek": "llm-deepseek";
}>;
export declare const resolveKindSchema: z.ZodEnum<{
    exact: "exact";
    alias: "alias";
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
        first: "first";
    }>;
}, z.core.$strip>;
export declare const targetsSchema: z.ZodObject<{
    llmPiAi: z.ZodBoolean;
    llmDeepseek: z.ZodBoolean;
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
    ns: z.ZodEnum<{
        "llm-pi-ai": "llm-pi-ai";
        "llm-deepseek": "llm-deepseek";
    }>;
    provider: z.ZodString;
    model: z.ZodString;
    contextWindow: z.ZodNumber;
    kind: z.ZodEnum<{
        exact: "exact";
        alias: "alias";
        match: "match";
    }>;
    matchedProvider: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const skipSchema: z.ZodObject<{
    ns: z.ZodEnum<{
        "llm-pi-ai": "llm-pi-ai";
        "llm-deepseek": "llm-deepseek";
    }>;
    provider: z.ZodString;
    model: z.ZodString;
    reason: z.ZodString;
}, z.core.$strip>;
export declare const unresolvedSchema: z.ZodObject<{
    ns: z.ZodEnum<{
        "llm-pi-ai": "llm-pi-ai";
        "llm-deepseek": "llm-deepseek";
    }>;
    provider: z.ZodString;
    model: z.ZodString;
    candidates: z.ZodNumber;
}, z.core.$strip>;
export declare const reportSchema: z.ZodType<WireReport>;
/** modelsSync 命名空间的严格调用描述符。 */
export declare const MODELS_SYNC_INVOCATIONS: readonly InvocationDescriptor[];
