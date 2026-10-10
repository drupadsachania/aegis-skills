import type { AuditReport, ExposureReport, VersionStamp } from '@aegis-skills/themis-core'
import { openAppDb } from '../../src/store/app-db'
import { ReportsRepo, themisMarkdown, auditMarkdown, exposureMarkdown, stampLine } from '../../src/store/reports'

const v: VersionStamp = { themis: '0.1.0', aegis: '1.1.0', osk: '1.1' }
const STAMP = /^Themis \d.* · Aegis .* \(osk .*\) · \d{4}-/m

const auditReport = {
  executiveSummary: 'All good.', standardsApplied: ['cis-l1', 'soc2'],
  findings: [{ controlId: 'CIS-1.1', standard: 'cis-l1', severity: 'high', title: 'Weak', evidence: 'e', recommendation: 'Fix it', reference: 'r' }],
  summary: { critical: 0, high: 1, medium: 0, low: 0, informational: 0, passed: 3 }, skillTrace: [], durationMs: 5,
} as unknown as AuditReport

const exposureReport = {
  case: { caseId: 'C-1', workflowState: 'verified' },
  risk: { before: { score: 80 }, after: null, delta: null, proven: false },
  executiveSummary: 'Exposed.',
  explain: { whyExposed: 'a', whyItMatters: 'b', whatProvesExploitability: 'c', assetAffected: 'd', controlOutcome: 'e', remediation: 'f', whatProvesClosed: 'g' },
} as unknown as ExposureReport

describe('ReportsRepo', () => {
  it('round-trips a report', () => {
    const repo = new ReportsRepo(openAppDb(':memory:'))
    const body = { a: [1, 2, { b: 'c' }] }
    repo.save({ id: 'r1', kind: 'themis', runId: 'run-1', title: 'T', versions: v, markdown: '# x', body })
    const got = repo.get('r1')
    expect(got?.body).toEqual(body)
    expect(got?.versions).toEqual(v)
    expect(got?.runId).toBe('run-1')
    expect(repo.get('nope')).toBeNull()
  })
  it('lists newest first, filters by kind and clamps the limit', () => {
    const repo = new ReportsRepo(openAppDb(':memory:'))
    const days = ['2026-01-01', '2026-01-02', '2026-01-03']
    days.forEach((d, i) => repo.save({ id: `r${i}`, kind: i === 1 ? 'audit' : 'themis', runId: null, title: d, versions: v, markdown: '', body: {}, createdAt: `${d}T00:00:00.000Z` }))
    expect(repo.list().map((r) => r.id)).toEqual(['r2', 'r1', 'r0'])
    expect(repo.list({ kind: 'audit' }).map((r) => r.id)).toEqual(['r1'])
    expect(repo.list({ limit: 0 })).toHaveLength(1)
    for (let i = 0; i < 210; i++) repo.save({ id: `m${i}`, kind: 'themis', runId: null, title: 't', versions: v, markdown: '', body: {} })
    expect(repo.list({ limit: 999 })).toHaveLength(200)
  })
  it('truncates titles to 120 chars', () => {
    const repo = new ReportsRepo(openAppDb(':memory:'))
    repo.save({ id: 'x', kind: 'themis', runId: null, title: 'a'.repeat(300), versions: v, markdown: '', body: {} })
    expect(repo.get('x')?.title).toHaveLength(120)
  })
})

describe('markdown', () => {
  const createdAt = '2026-10-10T00:00:00.000Z'
  it('stamps every kind', () => {
    const t = themisMarkdown({ runId: 'r', task: 'do it', report: 'body', guardrailSummary: { passed: 1, flagged: 0, blocked: 0 }, approvals: [], versions: v, durationMs: 1, createdAt })
    for (const md of [t, auditMarkdown(auditReport, v, createdAt), exposureMarkdown(exposureReport, v, createdAt)]) {
      expect(md).toMatch(STAMP)
    }
    expect(stampLine(v)).toBe('Themis 0.1.0 · Aegis 1.1.0 (osk 1.1)')
  })
  it('themis markdown lists None. without approvals and bullets with them', () => {
    const base = { runId: 'r', task: 't', report: 'b', guardrailSummary: { passed: 2, flagged: 1, blocked: 0 }, versions: v, durationMs: 1, createdAt }
    expect(themisMarkdown({ ...base, approvals: [] })).toContain('None.')
    const md = themisMarkdown({ ...base, approvals: [{ id: 'a', serverId: 'srv', tool: 'scan', toolClass: 'active', status: 'pending' }] })
    expect(md).toContain('- srv/scan (active) — pending')
    expect(md).toContain('Passed 2 · Flagged 1 · Blocked 0')
  })
  it('audit and exposure layouts', () => {
    expect(auditMarkdown(auditReport, v, createdAt)).toContain('- **[high]** CIS-1.1 Weak — Fix it')
    const e = exposureMarkdown(exposureReport, v, createdAt)
    expect(e).toContain('Before 80 → After n/a')
    expect(e).toContain('**Workflow state:** verified')
  })
})
