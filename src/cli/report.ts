import type { SyncReport } from '../core/types.ts'

/** 人类可读的报告。 */
export function formatReport(report: SyncReport, applied: boolean): string {
  const lines: string[] = []
  lines.push(`数据源: ${report.source}`)
  lines.push(`拉取时间: ${report.fetchedAt}`)
  lines.push(`来源模型条数: ${report.sourceModels}`)
  if (report.errors.length > 0) {
    lines.push('')
    lines.push('错误:')
    for (const error of report.errors) lines.push(`  ${error}`)
  }
  lines.push('')
  const verb = applied ? '已写入' : '将写入（dry-run，未落盘）'
  lines.push(`${verb} ${report.written.length} 条:`)
  for (const write of report.written) {
    const via = write.kind === 'exact'
      ? '精确命中'
      : write.kind === 'alias'
        ? `alias(${write.matchedProvider ?? '?'})`
        : `跨 provider 匹配(${write.matchedProvider ?? '?'})`
    lines.push(`  [${write.ns}] ${write.provider} / ${write.model} -> ${write.contextWindow} (${via})`)
  }
  lines.push('')
  lines.push(`跳过 ${report.skipped.length} 条:`)
  for (const skip of report.skipped) {
    lines.push(`  [${skip.ns}] ${skip.provider} / ${skip.model}: ${skip.reason}`)
  }
  lines.push('')
  lines.push(`未命中 ${report.unresolved.length} 条:`)
  for (const miss of report.unresolved) {
    lines.push(`  [${miss.ns}] ${miss.provider} / ${miss.model}`)
  }
  return lines.join('\n')
}
