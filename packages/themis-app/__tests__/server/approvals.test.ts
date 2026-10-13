import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { newApprovalRequest, startRun, type ApprovalRequest } from '@aegis-skills/themis-core'
import { useTempHome } from '../helpers/fixtures'
import { makeTestDeps, startTestServer } from '../helpers/test-deps'
import { fakeGatewayFactory } from '../helpers/fake-gateway'
import { request, authed, type ReqOpts, type Resp } from '../helpers/http-client'
import type { AppDeps } from '../../src/server/deps'
import type { Dashboard } from '../../src/server/http'
import { buildGatewayTools } from '../../src/graph/gateway-tools'
import { fetchSkillPhaseTool, makeReadFindingsTool } from '../../src/graph/tools'

useTempHome()
const V = { themis: '0.1.0', aegis: '1.1.0', osk: '1.1' }
const pend = (runId: string, args: unknown = { title: 'x' }): ApprovalRequest =>
  newApprovalRequest({ runId, serverId: 's', tool: 'create_ticket', toolClass: 'write', args, reason: 'why' })

describe('approval routes', () => {
  let dash: Dashboard
  let deps: AppDeps
  let ui: string
  let A: ApprovalRequest
  beforeEach(async () => {
    ui = fs.mkdtempSync(path.join(os.tmpdir(), 'themis-ui-'))
    deps = makeTestDeps()
    deps.store.saveRun({ ...startRun('t', V, { runId: 'r1' }), status: 'awaiting_approval', step: 'schedule' })
    A = pend('r1')
    deps.store.putApproval(A)
    dash = await startTestServer(deps, ui)
  })
  afterEach(async () => { await dash.close(); fs.rmSync(ui, { recursive: true, force: true }) })

  const call = (method: string, p: string, o: ReqOpts = {}): Promise<Resp> =>
    request(dash.port, method, p, { ...o, headers: { ...authed(dash.port, dash.token), ...o.headers } })
  const decide = (id: string, body: unknown = { decision: 'approved' }): Promise<Resp> =>
    call('POST', `/api/approvals/${id}/decision`, { body })
  const resume = (): jest.Mock => deps.runner.resume as unknown as jest.Mock

  describe('only an authenticated, same-origin human request can decide', () => {
    const attacks: Array<[string, ReqOpts, number]> = [
      ['no cookie', { headers: { Cookie: '' } }, 401],
      ['no Origin', { headers: { Origin: '' } }, 403],
      ['foreign Origin', { headers: { Origin: 'http://evil.example' } }, 403],
      ['foreign Host', { headers: { Host: 'evil.example:1' } }, 403],
      ['cross-site fetch metadata', { headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403],
    ]
    it.each(attacks)('%s leaves the approval pending', async (_name, o, status) => {
      // Raw request: the helper below must not re-add the headers we blank out.
      const headers: Record<string, string> = { ...authed(dash.port, dash.token), ...o.headers }
      for (const k of Object.keys(headers)) if (headers[k] === '') delete headers[k]
      if (o.headers?.Host) headers.Host = o.headers.Host.replace(':1', `:${dash.port}`)
      const r = await request(dash.port, 'POST', `/api/approvals/${A.id}/decision`, { headers, body: { decision: 'approved' } })
      expect(r.status).toBe(status)
      expect(deps.store.getApproval(A.id)).toMatchObject({ status: 'pending', decidedBy: null })
      expect(resume()).not.toHaveBeenCalled()
    })
  })

  it('a valid human decision approves and resumes the run once', async () => {
    const r = await decide(A.id)
    expect(r.status).toBe(200)
    expect(r.json.approval).toMatchObject({ status: 'approved', decidedBy: 'human' })
    expect(r.json.runResumed).toBe(true)
    expect(resume()).toHaveBeenCalledTimes(1)
    expect(resume()).toHaveBeenCalledWith('r1')
  })

  it('does not resume while other approvals are pending', async () => {
    deps.store.putApproval(pend('r1'))
    const r = await decide(A.id)
    expect(r.json.runResumed).toBe(false)
    expect(resume()).not.toHaveBeenCalled()
  })

  it('rejects repeats (409), unknown ids (404), bad decisions (400) and ignores decidedBy', async () => {
    expect((await decide(A.id)).status).toBe(200)
    expect((await decide(A.id)).status).toBe(409)
    expect((await decide('nope')).status).toBe(404)
    const B = pend('r1')
    deps.store.putApproval(B)
    expect((await decide(B.id, { decision: 'maybe' })).status).toBe(400)
    expect((await decide(B.id, { decision: 'approved', decidedBy: 'model' })).json.approval.decidedBy).toBe('human')
  })

  it('lists approval views with redaction and in-memory flags', async () => {
    const secret = pend('r1', { password: 'hunter2' })
    deps.store.putApproval(secret)
    ;(deps as { gateways: AppDeps['gateways'] }).gateways = { holdsArgs: () => false }
    const r = await call('GET', '/api/approvals?status=pending')
    expect(r.status).toBe(200)
    const view = r.json.approvals.find((a: { id: string }) => a.id === secret.id)
    expect(view).toMatchObject({ argsRedacted: true, argsInMemory: false, willNeedReproposal: true })
    expect(r.text).not.toContain('hunter2')
    expect((await call('GET', '/api/approvals?status=bogus')).status).toBe(400)
  })

  it('static invariant: only routes/approvals.ts calls decideApproval, exactly once', () => {
    const root = path.join(__dirname, '..', '..', 'src')
    const hits: Array<{ file: string; n: number }> = []
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.(ts|tsx|js)$/.test(e.name)) {
          const n = (fs.readFileSync(p, 'utf8').match(/\.decideApproval\s*\(/g) ?? []).length
          if (n > 0) hits.push({ file: path.relative(root, p).split(path.sep).join('/'), n })
        }
      }
    }
    walk(root)
    expect(hits).toEqual([{ file: 'server/routes/approvals.ts', n: 1 }])
  })

  it('no model-reachable tool can decide an approval', async () => {
    const spy = jest.spyOn(deps.store, 'decideApproval')
    const fake = fakeGatewayFactory(deps.store).factory({ skill: 'compliance', runId: 'r1' })
    const tools = [...(await buildGatewayTools(fake, 'compliance', () => undefined)), fetchSkillPhaseTool, makeReadFindingsTool([])]
    for (const t of tools) {
      await Promise.resolve(t.invoke({ decision: 'approved', status: 'approved' })).catch(() => undefined)
    }
    expect(spy).not.toHaveBeenCalled()
  })
})
