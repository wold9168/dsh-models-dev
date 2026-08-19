/**
 * 取数：按源配置解析 URL，经可选 HTTP(S) 代理拉取 models.dev 数据。
 *
 * Node 内置 fetch 不读代理、无法注入分发器，因此这里用 undici 的 fetch +
 * ProxyAgent 实现代理感知请求；无代理时仍走 undici（行为与全局 fetch 一致）。
 */
import { fetch as undiciFetch, ProxyAgent } from 'undici'
import type { Dispatcher } from 'undici'
import type { SyncSourceConfig } from './types.ts'

const DEFAULT_TIMEOUT_MS = 30_000
const USER_AGENT = 'dsh-models-sync/0.1'

/** 由源配置解析实际 URL。 */
export function sourceUrl(source: SyncSourceConfig): string {
  if (source.kind === 'url') {
    if (source.url === undefined || source.url.length === 0) {
      throw new Error('models-sync: 源类型为 url 时必须提供 source.url')
    }
    return source.url
  }
  if (source.kind === 'github') {
    const repo = source.github?.repo ?? 'anomalyco/models.dev'
    const ref = source.github?.ref ?? 'dev'
    const file = source.github?.file ?? 'models.json'
    return `https://raw.githubusercontent.com/${repo}/${ref}/${file}`
  }
  return source.url !== undefined && source.url.length > 0 ? source.url : 'https://models.dev/api.json'
}

/**
 * 拉取并解析 JSON。
 * @param url 数据源 URL。
 * @param proxy HTTP(S) 代理 URL；空/缺省走直连。
 * @param timeoutMs 请求超时。
 */
export async function fetchJson(
  url: string,
  proxy: string | undefined,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<unknown> {
  const useProxy = proxy !== undefined && proxy.trim().length > 0
  let agent: ProxyAgent | undefined
  const dispatcher: Dispatcher | undefined = useProxy ? (agent = new ProxyAgent(proxy)) : undefined
  try {
    const response = await undiciFetch(url, {
      dispatcher,
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) {
      throw new Error(`models-sync: GET ${url} 失败，HTTP ${response.status}`)
    }
    return await response.json()
  } finally {
    // 每次调用独立的 ProxyAgent，用毕即关，避免连接泄漏。
    await agent?.close()
  }
}
