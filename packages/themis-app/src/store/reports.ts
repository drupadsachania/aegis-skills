import type { AuditReport, ExposureReport, VersionStamp } from '@aegis-skills/themis-core'
import type { AppDb } from './app-db'

export type ReportKind = 'themis' | 'audit' | 'exposure'
export interface ReportRecord {
  id: string; kind: ReportKind; runId: string | null; title: string; createdAt: string
  versions: VersionStamp; markdown: string; body: unknown
}
export type ReportSummary = Omit<ReportRecord, 'markdown' | 'body'>

interface Row {
  id: string; kind: ReportKind; run_id: string | null; title: string; created_at: string
  versions: string; markdown: string; body: string
}

const summaryOf = (r: Row): ReportSummary => ({
  id: r.id, kind: r.kind, runId: r.run_id, title: r.title, createdAt: r.created_at,
  versions: JSON.parse(r.versions) as VersionStamp,
})

export class ReportsRepo {
  constructor(private readonly db: AppDb) {}

  save(r: Omit<ReportRecord, 'createdAt'> & { createdAt?: string }): ReportRecord {
    const createdAt = r.createdAt ?? new Date().toISOString()
    const title = r.title.slice(0, 120)
    this.db.prepare(`INSERT OR REPLACE INTO app_reports
      (id, kind, run_id, title, created_at, versions, markdown, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(r.id, r.kind, r.runId, title, createdAt, JSON.stringify(r.versions), r.markdown, JSON.stringify(r.body ?? null))
    return { ...r, title, createdAt }
  }

  get(id: string): ReportRecord | null {
    const row = this.db.prepare('SELECT * FROM app_reports WHERE id = ?').get(id) as unknown as Row | undefined
    if (!row) return null
    return { ...summaryOf(row), markdown: row.markdown, body: JSON.parse(row.body) as unknown }
  }

  list(opts: { kind?: ReportKind; limit?: number } = {}): ReportSummary[] {
    const limit = Math.min(200, Math.max(1, Math.trunc(opts.limit ?? 50) || 1))
    const rows = (opts.kind
      ? this.db.prepare('SELECT * FROM app_reports WHERE kind = ? ORDER BY created_at DESC LIMIT ?').all(opts.kind, limit)
      : this.db.prepare('SELECT * FROM app_reports ORDER BY created_at DESC LIMIT ?').all(limit)) as unknown as Row[]
    return rows.map(summaryOf)
  }
}

export function stampLine(v: VersionStamp): string {
  return `Themis ${v.themis} · Aegis ${v.aegis} (osk ${v.osk})`
}

const footer = (v: VersionStamp, createdAt: string): string => `\n---\n${stampLine(v)} · ${createdAt}\n`

export function themisMarkdown(i: {
  runId: string; task: string; report: string
  guardrailSummary: { passed: number; flagged: number; blocked: number }
  approvals: Array<{ id: string; serverId: string; tool: string; toolClass: string; status: string }>
  versions: VersionStamp; durationMs: number; createdAt: string
}): string {
  const g = i.guardrailSummary
  const actions = i.approvals.length
    ? i.approvals.map((a) => `- ${a.serverId}/${a.tool} (${a.toolClass}) — ${a.status}`).join('\n')
    : 'None.'
  return [
    '# Themis report', '',
    `**Task:** ${i.task}`, '',
    i.report, '',
    '## Guardrail', '',
    `Passed ${g.passed} · Flagged ${g.flagged} · Blocked ${g.blocked}`, '',
    '## Proposed actions', '',
    actions,
  ].join('\n') + '\n' + footer(i.versions, i.createdAt)
}

export function auditMarkdown(r: AuditReport, v: VersionStamp, createdAt: string): string {
  const findings = r.findings.length
    ? r.findings.map((f) => `- **[${f.severity}]** ${f.controlId} ${f.title} — ${f.recommendation}`).join('\n')
    : 'No findings.'
  const s = r.summary
  return [
    '# Compliance audit', '',
    `**Standards:** ${r.standardsApplied.join(', ')}`, '',
    r.executiveSummary, '',
    '## Findings', '',
    findings, '',
    '## Summary', '',
    `Critical ${s.critical} · High ${s.high} · Medium ${s.medium} · Low ${s.low} · Informational ${s.informational} · Passed ${s.passed}`,
  ].join('\n') + '\n' + footer(v, createdAt)
}

export function exposureMarkdown(r: ExposureReport, v: VersionStamp, createdAt: string): string {
  const after = r.risk.after ? String(r.risk.after.score) : 'n/a'
  const e = r.explain
  return [
    '# Exposure validation', '',
    `**Case:** ${r.case.caseId}`,
    `**Workflow state:** ${r.case.workflowState}`, '',
    r.executiveSummary, '',
    '## Risk', '',
    `Before ${r.risk.before.score} → After ${after}`, '',
    '## Explain', '',
    `- Why exposed: ${e.whyExposed}`,
    `- Why it matters: ${e.whyItMatters}`,
    `- What proves exploitability: ${e.whatProvesExploitability}`,
    `- Asset affected: ${e.assetAffected}`,
    `- Control outcome: ${e.controlOutcome}`,
    `- Remediation: ${e.remediation}`,
    `- What proves it closed: ${e.whatProvesClosed}`,
  ].join('\n') + '\n' + footer(v, createdAt)
}
