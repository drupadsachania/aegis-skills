import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { newApprovalRequest, ProviderUnavailableError, startRun } from '@aegis-skills/themis-core'
import { useTempHome } from '../helpers/fixtures'
import { makeTestDeps, startTestServer } from '../helpers/test-deps'
import { request, authed, type ReqOpts, type Resp } from '../helpers/http-client'
import type { AppDeps } from '../../src/server/deps'
import type { Dashboard } from '../../src/server/http'
import { BusyError } from '../../src/runner/runner'

useTempHome()
const V = { themis: '0.1.0', aegis: '1.1.0', osk: '1.1' }

describe('run routes', () => {
  let dash: Dashboard
  let deps: AppDeps
  let ui: string
  beforeEach(async () => {
    ui = fs.mkdtempSync(path.join(os.tmpdir(), 'themis-ui-'))
    deps = makeTestDeps()
    dash = await startTestServer(deps, ui)
  })
  afterEach(async () => { await dash.close(); fs.rmSync(ui, { recursive: true, force: true }) })

  const call = (method: string, p: string, o: ReqOpts = {}): Promise<Resp> =>
    request(dash.port, method, p, { ...o, headers: { ...authed(dash.port, dash.token), ...o.headers } })
  const post = (body: unknown): Promise<Resp> => call('POST', '/api/runs', { body })
  const startMock = (): jest.Mock => deps.runner.start as unknown as jest.Mock
  const expectHardened = (r: Resp): void => {
    expect(r.headers['x-content-type-options']).toBe('nosniff')
    expect(r.headers['x-frame-options']).toBe('DENY')
  }

  it('rejects invalid requests with 400 {error:"Request invalid"}', async () => {
    for (const body of [{}, { task: 'x'.repeat(4001) }, { task: 42 }, null]) {
      const r = await post(body)
      expect(r.status).toBe(400)
      expect(r.json).toEqual({ error: 'Request invalid' })
    }
    const bad = await call('POST', '/api/runs', { rawBody: '{bad' })
    expect(bad.status).toBe(400)
  })

  it('enforces content type and body size', async () => {
    const plain = await call('POST', '/api/runs', { headers: { 'Content-Type': 'text/plain' }, rawBody: '{}' })
    expect(plain.status).toBe(415)
    const big = await call('POST', '/api/runs', { rawBody: JSON.stringify({ task: 'x'.repeat(70000) }) })
    expect(big.status).toBe(413)
  })

  it('maps provider-unavailable to 503, busy to 429 and anything else to a generic 500', async () => {
    startMock().mockImplementationOnce(() => { throw new ProviderUnavailableError('none') })
    const unavailable = await post({ task: 'hello' })
    expect(unavailable.status).toBe(503)
    expect(unavailable.json).toEqual({ error: 'AI providers unavailable' })
    startMock().mockImplementationOnce(() => { throw new BusyError() })
    const busy = await post({ task: 'hello' })
    expect(busy.status).toBe(429)
    expect(busy.headers['retry-after']).toBe('10')
    startMock().mockImplementationOnce(() => { throw new Error('db') })
    const boom = await post({ task: 'hello' })
    expect(boom.status).toBe(500)
    expect(boom.json).toEqual({ error: 'Internal error' })
    expect(boom.text).not.toContain('db')
    for (const r of [unavailable, busy, boom, await post({}), await post({ task: 'hello' })]) expectHardened(r)
  })

  it('starts a valid run', async () => {
    const r = await post({ task: '  Assess our baseline  ', context: { environments: ['prod', 7], attackSurfaceTags: ['web'] }, provider: 'openai' })
    expect(r.status).toBe(202)
    expect(r.json).toEqual({ runId: 'run-test' })
    expectHardened(r)
    expect(startMock()).toHaveBeenCalledTimes(1)
    const arg = startMock().mock.calls[0][0]
    expect(arg.task.trim()).toBe('Assess our baseline')
    expect(arg.context).toEqual({ environments: ['prod'], attackSurfaceTags: ['web'] })
    expect(arg.provider).toBe('openai')
  })

  it('lists run summaries with pending approvals', async () => {
    deps.store.saveRun(startRun('t'.repeat(300), V, { runId: 'r1' }))
    deps.store.putApproval(newApprovalRequest({ runId: 'r1', serverId: 's', tool: 'x', toolClass: 'write', args: {}, reason: 'why' }))
    const r = await call('GET', '/api/runs?limit=5')
    expect(r.status).toBe(200)
    expect(r.json.runs).toHaveLength(1)
    expect(r.json.runs[0]).toMatchObject({ runId: 'r1', status: 'running', pendingApprovals: 1, error: null })
    expect(r.json.runs[0].task).toHaveLength(200)
  })

  it('gets one run (404 and 400 paths)', async () => {
    deps.store.saveRun(startRun('t', V, { runId: 'r1' }))
    const ok = await call('GET', '/api/runs/r1')
    expect(ok.status).toBe(200)
    expect(ok.json).toMatchObject({ report: null, active: false })
    expect(ok.json.run.runId).toBe('r1')
    expect((await call('GET', '/api/runs/nope')).status).toBe(404)
    expect((await call('GET', '/api/runs/bad%20id')).status).toBe(400)
  })

  it('streams history then ends for a finished run (SSE) without findings', async () => {
    deps.store.saveRun(startRun('t', V, { runId: 'r1' }))
    deps.events.emit('r1', { type: 'step', step: 'validate', status: 'started' })
    deps.events.emit('r1', { type: 'step', step: 'validate', status: 'completed' })
    const r = await call('GET', '/api/runs/r1/events')
    expect(r.status).toBe(200)
    expect(String(r.headers['content-type'])).toMatch(/^text\/event-stream/)
    expect(r.text.match(/event: run/g)).toHaveLength(2)
    expect(r.text).toContain('event: end')
    expect(r.text).not.toContain('findings')
    expect((await call('GET', '/api/runs/zzz/events')).status).toBe(404)
  })

  it('returns audit events and resumes through the runner', async () => {
    deps.store.saveRun(startRun('t', V, { runId: 'r1' }))
    expect((await call('GET', '/api/runs/r1/audit')).json).toEqual({ events: [] })
    expect((await call('GET', '/api/runs/nope/audit')).status).toBe(404)
    const r = await call('POST', '/api/runs/r1/resume', { body: {} })
    expect(r.status).toBe(202)
    expect(deps.runner.resume).toHaveBeenCalledWith('r1')
  })
})
