import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ProviderUnavailableError, type AuditReport, type ExposureReport } from '@aegis-skills/themis-core'
import { useTempHome } from '../helpers/fixtures'
import { makeTestDeps, startTestServer } from '../helpers/test-deps'
import { request, authed, type ReqOpts, type Resp } from '../helpers/http-client'
import type { AppDeps } from '../../src/server/deps'
import type { Dashboard } from '../../src/server/http'

useTempHome()

const auditReport = {
  executiveSummary: 'All good.', standardsApplied: ['cis-l1'],
  findings: [], summary: { critical: 0, high: 0, medium: 0, low: 0, informational: 0, passed: 3 }, skillTrace: ['compliance'], durationMs: 5,
} as unknown as AuditReport

const exposureReport = {
  case: { caseId: 'C-1', cve: 'CVE-2024-1234', workflowState: 'verified', states: {} },
  policy: { decision: 'allow' },
  risk: { before: { score: 80 }, after: null, delta: null, proven: false },
  executiveSummary: 'Exposed.', durationMs: 7,
  explain: { whyExposed: 'a', whyItMatters: 'b', whatProvesExploitability: 'c', assetAffected: 'd', controlOutcome: 'e', remediation: 'f', whatProvesClosed: 'g' },
} as unknown as ExposureReport

describe('audit and exposure routes', () => {
  let dash: Dashboard
  let deps: AppDeps
  let ui: string
  beforeEach(async () => {
    ui = fs.mkdtempSync(path.join(os.tmpdir(), 'themis-ui-'))
    deps = makeTestDeps({
      runAudit: jest.fn(async () => auditReport),
      runExposure: jest.fn(async () => exposureReport),
    })
    dash = await startTestServer(deps, ui)
  })
  afterEach(async () => { await dash.close(); fs.rmSync(ui, { recursive: true, force: true }) })

  const post = (p: string, body: unknown, o: ReqOpts = {}): Promise<Resp> =>
    request(dash.port, 'POST', p, { body, ...o, headers: { ...authed(dash.port, dash.token), ...o.headers } })
  const auditArg = (): any => (deps.runAudit as jest.Mock).mock.calls[0][0] // eslint-disable-line @typescript-eslint/no-explicit-any
  const exposureArg = (): any => (deps.runExposure as jest.Mock).mock.calls[0][0] // eslint-disable-line @typescript-eslint/no-explicit-any

  describe('POST /api/audit', () => {
    it('rejects over-long, missing and invalid input', async () => {
      expect((await post('/api/audit', { input: 'x'.repeat(12001) })).status).toBe(400)
      expect((await post('/api/audit', {})).status).toBe(400)
      expect((await post('/api/audit', null)).status).toBe(400)
      expect((await post('/api/audit', null, { rawBody: '{bad' })).status).toBe(400)
    })

    it('normalises the request', async () => {
      const r = await post('/api/audit', {
        input: 'cfg', inputType: 'bogus', standards: ['soc2', 'made-up'], context: { systemType: 'Bad Slug!', environments: ['prod', 'x y'] },
      })
      expect(r.status).toBe(200)
      expect(auditArg()).toMatchObject({ inputType: 'description', standards: ['soc2'], context: { systemType: undefined, environments: ['prod'] } })
      await post('/api/audit', { input: 'cfg', standards: 'soc2' })
      expect((deps.runAudit as jest.Mock).mock.calls[1][0].standards).toEqual([])
    })

    it('returns the report with id and versions, stamped markdown and a metadata-only audit event', async () => {
      const r = await post('/api/audit', { input: 'SECRET-INPUT-TEXT' })
      expect(r.status).toBe(200)
      expect(r.json).toMatchObject({ standardsApplied: ['cis-l1'], versions: deps.versions })
      expect(r.headers['x-content-type-options']).toBe('nosniff')
      const rec = deps.reports.get(r.json.reportId)
      expect(rec?.kind).toBe('audit')
      expect(rec?.markdown.trimEnd()).toMatch(/Themis 0\.1\.0 · Aegis 1\.1\.0 \(osk 1\.1\) · \d{4}-[^\n]*$/)
      const events = deps.store.listAudit(r.json.reportId)
      expect(events).toHaveLength(1)
      expect(JSON.stringify(events[0].data)).toContain('inputHash')
      expect(JSON.stringify(events)).not.toContain('SECRET-INPUT-TEXT')
    })

    it('returns 503 when no provider is available', async () => {
      deps.resolveProvider = () => { throw new ProviderUnavailableError('none') }
      expect((await post('/api/audit', { input: 'x' })).status).toBe(503)
    })
  })

  describe('POST /api/exposure', () => {
    it('rejects non-string input and malformed JSON', async () => {
      expect((await post('/api/exposure', { input: 5 })).status).toBe(400)
      expect((await post('/api/exposure', null, { rawBody: '{nope' })).status).toBe(400)
    })

    it('accepts a valid request, defaulting authorization flags to false', async () => {
      const r = await post('/api/exposure', { input: 'host A', cve: 'cve-2024-1234', context: { businessCriticality: 'high', crownJewel: true } })
      expect(r.status).toBe(200)
      expect(r.headers['x-frame-options']).toBe('DENY')
      expect(r.json.reportId).toBeDefined()
      expect(exposureArg()).toMatchObject({
        input: 'host A', cve: 'CVE-2024-1234',
        authorization: { authorized: false, scopeConfirmed: false, targetIdentityVerified: false, maintenanceWindow: false },
        context: { businessCriticality: 'high', crownJewel: true },
      })
      expect(deps.reports.get(r.json.reportId)?.kind).toBe('exposure')
    })

    it('drops an invalid CVE and invalid evidence, and redacts secrets in evidence', async () => {
      await post('/api/exposure', {
        input: 'x', cve: 'not-a-cve',
        providedEvidence: [
          { type: 'bogus', summary: 's', source: 'src' },
          { type: 'asset', summary: 'key AKIAIOSFODNN7EXAMPLE leaked', source: 'scan' },
        ],
      })
      const a = exposureArg()
      expect(a.cve).toBeUndefined()
      expect(a.providedEvidence).toHaveLength(1)
      expect(a.providedEvidence[0].summary).not.toContain('AKIAIOSFODNN7EXAMPLE')
    })

    it('returns 503 when no provider is available', async () => {
      deps.resolveProvider = () => { throw new ProviderUnavailableError('none') }
      expect((await post('/api/exposure', { input: 'x' })).status).toBe(503)
    })
  })
})
