import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { useTempHome } from '../helpers/fixtures'
import { makeTestDeps, startTestServer } from '../helpers/test-deps'
import { request, authed, type Resp } from '../helpers/http-client'
import type { AppDeps } from '../../src/server/deps'
import type { Dashboard } from '../../src/server/http'
import { stampLine } from '../../src/store/reports'

useTempHome()
const V = { themis: '0.1.0', aegis: '1.1.0', osk: '1.1' }

describe('report routes', () => {
  let dash: Dashboard
  let deps: AppDeps
  let ui: string
  beforeEach(async () => {
    ui = fs.mkdtempSync(path.join(os.tmpdir(), 'themis-ui-'))
    deps = makeTestDeps()
    deps.reports.save({ id: 'a1', kind: 'audit', runId: null, title: 'Audit', versions: V, markdown: `# A\n\n---\n${stampLine(V)}\n`, body: { x: 1 }, createdAt: '2026-01-01T00:00:00.000Z' })
    deps.reports.save({ id: 't1', kind: 'themis', runId: 'r1', title: 'Themis', versions: V, markdown: '# T', body: {}, createdAt: '2026-01-02T00:00:00.000Z' })
    dash = await startTestServer(deps, ui)
  })
  afterEach(async () => { await dash.close(); fs.rmSync(ui, { recursive: true, force: true }) })
  const get = (p: string): Promise<Resp> => request(dash.port, 'GET', p, { headers: authed(dash.port, dash.token) })

  it('lists newest first and filters by kind', async () => {
    expect((await get('/api/reports')).json.reports.map((r: { id: string }) => r.id)).toEqual(['t1', 'a1'])
    expect((await get('/api/reports?kind=audit')).json.reports.map((r: { id: string }) => r.id)).toEqual(['a1'])
    expect((await get('/api/reports?kind=bogus')).status).toBe(400)
  })

  it('gets one report, or 404', async () => {
    const ok = await get('/api/reports/a1')
    expect(ok.status).toBe(200)
    expect(ok.json.report.markdown).toContain('# A')
    expect((await get('/api/reports/zz')).status).toBe(404)
  })

  it('exports markdown with the stamp and a safe attachment name', async () => {
    const r = await get('/api/reports/a1/export')
    expect(r.status).toBe(200)
    expect(String(r.headers['content-disposition'])).toMatch(/^attachment; filename="themis-audit-/)
    expect(r.text.trimEnd().endsWith(stampLine(V))).toBe(true)
  })

  it('exports json with versions and rejects other formats', async () => {
    const r = await get('/api/reports/a1/export?format=json')
    expect(r.status).toBe(200)
    expect(r.json).toMatchObject({ x: 1, versions: V })
    expect((await get('/api/reports/a1/export?format=pdf')).status).toBe(400)
  })
})
