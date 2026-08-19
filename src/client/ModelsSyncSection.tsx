/**
 * models-sync 设置页：数据源/代理/匹配策略配置、查询 context 数据、手动同步触发、
 * 同步结果，以及「仅面板内联」的调试日志（含导出为 JSON 文件）。
 *
 * hooks 组件注入：inject face 的 `hooks.scope` / `hooks.debug` 由 slot 运行
 * 时绑定为 `useScope` / `useDebug` 选择器钩子（见 InjectFace 语义）。
 */
import { useEffect, useState, type CSSProperties, type ReactElement } from 'react'
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ModelsSyncSection as Section, WireQueryResult, WireReport } from '../types.ts'
import type { ModelsDebugBuffer } from './debug-buffer.ts'
import type { ModelsSyncKey } from './locales.ts'

/** 客户端缺省配置（与宿主 schema 缺省一致，供首帧渲染与导出兜底）。 */
export function defaultSection(): Section {
  return {
    source: { kind: 'api' },
    matching: { aliases: {}, preferredProviders: [], policy: 'mode' },
    debug: false,
    maxLogMb: 2,
  }
}

/** 注入面：hooks 组件绑定为 useScope/useDebug，其余成员直通。 */
export interface ModelsSyncSectionInjected {
  hooks: {
    scope: HostObservable<{ value: Section }>
    debug: HostObservable<{ value: ModelsDebugBuffer }>
  }
  updateConfig: (section: Section) => Promise<void>
  run: () => Promise<WireReport>
  query: (provider: string, model: string) => Promise<WireQueryResult>
}

/** 完整组件 props：运行时份额 + 注入面 + 文案座位。 */
export type ModelsSyncSectionProps =
  PropsRuntime<'settings.section'> & InjectFace<ModelsSyncSectionInjected> & PropsLocale<'models-sync'>

const row: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, margin: '6px 0' }
const label: CSSProperties = { fontWeight: 600, fontSize: 13 }
const input: CSSProperties = {
  padding: '6px 8px', borderRadius: 6, border: '1px solid #8886',
  background: 'transparent', color: 'inherit', fontSize: 13,
}
const hint: CSSProperties = { fontSize: 12, opacity: 0.62 }
const button: CSSProperties = {
  padding: '8px 16px', borderRadius: 6, border: '1px solid #8886',
  cursor: 'pointer', background: 'transparent', color: 'inherit', fontSize: 13,
}
const pre: CSSProperties = {
  maxHeight: 260, overflow: 'auto', fontSize: 12, lineHeight: 1.5,
  padding: 8, borderRadius: 6, border: '1px solid #8884', whiteSpace: 'pre-wrap',
}

function aliasesToText(aliases: Record<string, string>): string {
  return Object.entries(aliases).map(([k, v]) => `${k}=${v}`).join(', ')
}
function parseAliases(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of text.split(',')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    if (key.length > 0) out[key] = part.slice(eq + 1).trim()
  }
  return out
}
function parseList(text: string): string[] {
  return text.split(',').map(s => s.trim()).filter(s => s.length > 0)
}

/** 导出时去除代理 URL 里的凭证（user:pass），避免敏感信息落盘。 */
function redactProxy(proxy: string | undefined): string | undefined {
  if (proxy === undefined || proxy === '') return proxy
  return proxy.replace(/\/\/[^/@]*@/u, '//***@')
}

/** 渲染设置页。 */
export function ModelsSyncSection({ useScope, useDebug, updateConfig, run, query, t }: ModelsSyncSectionProps) {
  const config = useScope(snapshot => snapshot.value) ?? defaultSection()
  const debug = useDebug(snapshot => snapshot.value)
  const [draft, setDraft] = useState<Section>(config)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<WireReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exported, setExported] = useState(false)
  const [qProvider, setQProvider] = useState('')
  const [qModel, setQModel] = useState('')
  const [qResult, setQResult] = useState<WireQueryResult | null>(null)
  const [logLimitText, setLogLimitText] = useState('2')
  const [logLimitError, setLogLimitError] = useState<string | null>(null)

  useEffect(() => { setDraft(config) }, [config])
  useEffect(() => { setLogLimitText(String(config.maxLogMb ?? 2)) }, [config])

  const patch = (partial: Partial<Section>): void => setDraft(current => ({ ...current, ...partial }))
  const patchSource = (source: Section['source']): void => patch({ source })

  const onLogLimitChange = (event: { target: { value: string } }): void => {
    const text = event.target.value
    setLogLimitText(text)
    const trimmed = text.trim()
    if (trimmed === '') { setLogLimitError(null); return }
    const value = Number(trimmed)
    if (!Number.isInteger(value) || (value !== -1 && value <= 0)) {
      setLogLimitError(t('maxLogMbInvalid'))
      return
    }
    setLogLimitError(null)
    patch({ maxLogMb: value })
  }

  const onSync = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    setExported(false)
    try {
      await updateConfig(draft)
      setReport(await run())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const onQuery = (): void => {
    setQResult(null)
    void query(qProvider.trim(), qModel.trim())
      .then(result => setQResult(result))
      .catch(cause => setQResult({ found: false, reason: cause instanceof Error ? cause.message : String(cause), source: '' }))
  }

  const onExport = (): void => {
    const payload = {
      app: '@deepseek-ai/dsh-models-sync',
      version: '0.1.0',
      exportedAt: new Date().toISOString(),
      config: { ...draft, proxy: redactProxy(draft.proxy) },
      maxLogMb: draft.maxLogMb ?? 2,
      truncated: debug?.truncated ?? false,
      records: debug?.records ?? [],
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `models-sync-debug-${new Date().toISOString().replace(/[:.]/gu, '-')}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setExported(true)
  }

  const debugOn = draft.debug === true
  const maxLogMb = draft.maxLogMb ?? 2
  const kindName = {
    exact: t('kindExact'),
    alias: t('kindAlias'),
    preferred: t('kindPreferred'),
    match: t('kindMatch'),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={row}>
        <span style={label}>{t('sourceKind')}</span>
        {(['api', 'url', 'github'] as const).map(kind => (
          <label key={kind} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input
              type="radio"
              name="models-sync-source"
              checked={draft.source.kind === kind}
              onChange={() => patchSource({ ...draft.source, kind })}
            />
            {t(kind === 'api' ? 'sourceApi' : kind === 'url' ? 'sourceUrl' : 'sourceGithub')}
          </label>
        ))}
      </div>

      {draft.source.kind === 'url' && (
        <div style={row}>
          <label style={label} htmlFor="ms-source-url">{t('sourceUrl')}</label>
          <input
            id="ms-source-url"
            style={input}
            value={draft.source.url ?? ''}
            onChange={event => patchSource({ ...draft.source, url: event.target.value })}
            placeholder="https://models.dev/api.json"
          />
        </div>
      )}

      {draft.source.kind === 'github' && (
        <>
          <div style={row}>
            <label style={label} htmlFor="ms-gh-repo">{t('githubRepo')}</label>
            <input
              id="ms-gh-repo"
              style={input}
              value={draft.source.github?.repo ?? ''}
              onChange={event => patchSource({
                ...draft.source,
                github: {
                  repo: event.target.value,
                  ref: draft.source.github?.ref ?? 'dev',
                  file: draft.source.github?.file ?? 'models.json',
                },
              })}
            />
          </div>
          <div style={row}>
            <label style={label} htmlFor="ms-gh-ref">{t('githubRef')}</label>
            <input
              id="ms-gh-ref"
              style={input}
              value={draft.source.github?.ref ?? 'dev'}
              onChange={event => patchSource({
                ...draft.source,
                github: {
                  repo: draft.source.github?.repo ?? 'anomalyco/models.dev',
                  ref: event.target.value,
                  file: draft.source.github?.file ?? 'models.json',
                },
              })}
            />
          </div>
          <div style={row}>
            <label style={label} htmlFor="ms-gh-file">{t('githubFile')}</label>
            <input
              id="ms-gh-file"
              style={input}
              value={draft.source.github?.file ?? 'models.json'}
              onChange={event => patchSource({
                ...draft.source,
                github: {
                  repo: draft.source.github?.repo ?? 'anomalyco/models.dev',
                  ref: draft.source.github?.ref ?? 'dev',
                  file: event.target.value,
                },
              })}
            />
          </div>
        </>
      )}

      <div style={row}>
        <label style={label} htmlFor="ms-proxy">{t('proxy')}</label>
        <input
          id="ms-proxy"
          style={input}
          value={draft.proxy ?? ''}
          onChange={event => patch({ proxy: event.target.value === '' ? undefined : event.target.value })}
          placeholder="http://127.0.0.1:7890"
        />
        <span style={hint}>{t('proxyHint')}</span>
      </div>

      <div style={row}>
        <label style={label} htmlFor="ms-policy">{t('policy')}</label>
        <select
          id="ms-policy"
          style={input}
          value={draft.matching.policy}
          onChange={event => patch({
            matching: { ...draft.matching, policy: event.target.value as Section['matching']['policy'] },
          })}
        >
          <option value="mode">{t('policyMode')}</option>
          <option value="max">{t('policyMax')}</option>
          <option value="min">{t('policyMin')}</option>
        </select>
        <span style={hint}>{t('policyHint')}</span>
      </div>

      <div style={row}>
        <label style={label} htmlFor="ms-preferred">{t('preferredProviders')}</label>
        <input
          id="ms-preferred"
          style={input}
          value={draft.matching.preferredProviders.join(', ')}
          onChange={event => patch({
            matching: { ...draft.matching, preferredProviders: parseList(event.target.value) },
          })}
        />
        <span style={hint}>{t('preferredHint')}</span>
      </div>

      <div style={row}>
        <label style={label} htmlFor="ms-aliases">{t('aliases')}</label>
        <input
          id="ms-aliases"
          style={input}
          value={aliasesToText(draft.matching.aliases)}
          onChange={event => patch({
            matching: { ...draft.matching, aliases: parseAliases(event.target.value) },
          })}
        />
        <span style={hint}>{t('aliasesHint')}</span>
      </div>

      <div style={row}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={debugOn}
            onChange={event => patch({ debug: event.target.checked })}
          />
          <span>{t('debug')}</span>
        </label>
        <span style={hint}>{t('debugHint')}</span>
      </div>

      <div style={row}>
        <label style={label} htmlFor="ms-maxlog">{t('maxLogMb')}</label>
        <input
          id="ms-maxlog"
          type="text"
          inputMode="numeric"
          style={input}
          value={logLimitText}
          onChange={onLogLimitChange}
        />
        <span style={hint}>{logLimitError !== null ? logLimitError : t('maxLogMbHint')}</span>
      </div>

      <div style={row}>
        <span style={label}>{t('queryLabel')}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            style={input}
            placeholder={t('queryProviderPlaceholder')}
            value={qProvider}
            onChange={event => setQProvider(event.target.value)}
          />
          <input
            style={input}
            placeholder={t('queryModelPlaceholder')}
            value={qModel}
            onChange={event => setQModel(event.target.value)}
          />
          <button style={button} onClick={onQuery}>{t('queryButton')}</button>
        </div>
        <span style={hint}>{t('queryHint')}</span>
      </div>

      {qResult !== null && (
        <div style={row}>
          <span style={label}>{t('queryResultLabel')}</span>
          {qResult.found ? (
            <div style={{ fontSize: 13 }}>
              {t('queryContextWindow')}: {qResult.contextWindow}
              <br />
              {t('queryMaxTokens')}: {qResult.maxTokens !== undefined ? qResult.maxTokens : t('queryNotDisclosed')}
              <br />
              {t('queryWay')}: {kindName[qResult.kind ?? 'match']}
              {qResult.matchedProvider !== undefined ? `（${qResult.matchedProvider}）` : ''}
            </div>
          ) : (
            <div style={{ fontSize: 13, ...(qResult.reason?.includes('未找到') === true ? {} : { color: 'var(--danger, #d22)' }) }}>
              {qResult.reason ?? t('queryNotFound')}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button style={{ ...button, opacity: busy ? 0.6 : 1 }} onClick={() => { void onSync() }} disabled={busy}>
          {busy ? t('running') : t('runSync')}
        </button>
        {exported && <span style={hint}>{t('exported')}</span>}
      </div>

      {error !== null && (
        <div style={{ color: 'var(--danger, #d22)', fontSize: 13 }}>{error}</div>
      )}

      {report !== null && (
        <div style={row}>
          <span style={label}>{t('report')}</span>
          <div style={{ fontSize: 13 }}>
            {t('source')}: {report.source}
            <br />
            {t('sourceModels')}: {report.sourceModels}
            <br />
            {t('written')}: {report.written.length} / {t('skipped')}: {report.skipped.length} /
            {' '}{t('unresolved')}: {report.unresolved.length}
            {report.errors.length > 0 && <><br /><span style={{ color: 'var(--danger, #d22)' }}>{report.errors.join('；')}</span></>}
          </div>
        </div>
      )}

      <div style={row}>
        <span style={label}>{t('debugLog')}（{t('debugLogCap')} {maxLogMb === -1 ? t('unlimited') : `${String(maxLogMb)} MB`}）</span>
        {!debugOn && <span style={hint}>{t('debugOff')}</span>}
        {debugOn && (debug?.records.length === 0 ? (
          <span style={hint}>{t('debugEmpty')}</span>
        ) : (
          <>
            {debug?.truncated === true && <span style={hint}>{t('truncated')}</span>}
            <pre style={pre}>
              {debug?.records.map(record => `[${record.level}] ${record.ts} ${record.message}`).join('\n')}
            </pre>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button style={button} onClick={onExport}>{t('exportJson')}</button>
            </div>
          </>
        ))}
      </div>
    </div>
  )
}

// 满足 react-jsx 自动运行时对显式类型面的引用（无实际导出语义）。
export type ModelsSyncSectionElement = ReactElement
