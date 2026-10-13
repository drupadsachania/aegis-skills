import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createMemoryStore, openStore, themisHome } from '../src/store'
import { newApprovalRequest } from '../src/approvals'
import { auditEvent } from '../src/audit-log'
import { startRun } from '../src/workflow'
import type { ThemisStore } from '../src/contracts'

const V = { themis: '0.1.0', aegis: '1.1.0', osk: '1.1' }
const approval = (runId = 'run-1') => newApprovalRequest({ runId, serverId: 'osint', tool: 'create_ticket', toolClass: 'write', args: { title: 't' }, reason: 'record finding' })
const sqlite = () => (process as unknown as { getBuiltinModule: (id: string) => typeof import('node:sqlite') }).getBuiltinModule('node:sqlite')

describe.each<[string, () => ThemisStore]>([
  ['sqlite :memory:', () => openStore(':memory:')],
  ['memory', () => createMemoryStore()],
])('ThemisStore contract (%s)', (_label, make) => {
  let store: ThemisStore
  beforeEach(() => { store = make() })
  afterEach(() => store.close())

  it('round-trips and upserts runs', () => {
    const run = startRun('task', V, { runId: 'run-1', now: '2026-10-07T00:00:00.000Z' })
    store.saveRun(run)
    expect(store.getRun('run-1')).toEqual(run)
    store.saveRun({ ...run, step: 'decompose', updatedAt: '2026-10-07T00:00:01.000Z' })
    expect(store.getRun('run-1')?.step).toBe('decompose')
    expect(store.getRun('missing')).toBeNull()
  })
  it('lists runs newest first and honours the limit', () => {
    for (const [id, t] of [['r1', '01'], ['r2', '03'], ['r3', '02']]) {
      store.saveRun({ ...startRun('t', V, { runId: id }), updatedAt: `2026-10-07T00:00:${t}.000Z` })
    }
    expect(store.listRuns().map((r) => r.runId)).toEqual(['r2', 'r3', 'r1'])
    expect(store.listRuns(1)).toHaveLength(1)
  })
  it('returns copies, not live references', () => {
    store.saveRun(startRun('task', V, { runId: 'r1' }))
    store.getRun('r1')!.task = 'changed'
    expect(store.getRun('r1')!.task).toBe('task')
  })
  it('appends audit events in order, per run, with data redacted', () => {
    store.appendAudit(auditEvent('run-1', 'step', { step: 'validate' }))
    store.appendAudit({ id: 'e2', runId: 'run-1', at: '2026-10-07T00:00:00.000Z', kind: 'tool_call', data: { q: 'AKIAIOSFODNN7EXAMPLE' } })
    store.appendAudit(auditEvent('run-2', 'step', {}))
    const events = store.listAudit('run-1')
    expect(events.map((e) => e.kind)).toEqual(['step', 'tool_call'])
    expect(JSON.stringify(events)).not.toContain('AKIAIOSFODNN7EXAMPLE')
  })
  it('records only new pending approvals, with args redacted', () => {
    const a = approval()
    store.putApproval({ ...a, args: { password: 'hunter2' } })
    expect(store.getApproval(a.id)).toMatchObject({ status: 'pending', decidedBy: null, decidedAt: null })
    expect(JSON.stringify(store.getApproval(a.id)!.args)).not.toContain('hunter2')
    expect(() => store.putApproval(a)).toThrow(/already exists/)
    expect(() => store.putApproval({ ...approval(), status: 'approved', decidedBy: 'human' })).toThrow(/decideApproval/)
    expect(store.getApproval('missing')).toBeNull()
  })
  it('filters approvals by run and status, in insertion order', () => {
    const a = approval('r1'); const b = approval('r1'); const c = approval('r2')
    for (const x of [a, b, c]) store.putApproval(x)
    store.decideApproval(b.id, 'rejected')
    expect(store.listApprovals({ runId: 'r1' }).map((x) => x.id)).toEqual([a.id, b.id])
    expect(store.listApprovals({ runId: 'r1', status: 'pending' }).map((x) => x.id)).toEqual([a.id])
    expect(store.listApprovals()).toHaveLength(3)
  })
  it('decideApproval records a human decision and audits it', () => {
    const a = approval(); store.putApproval(a)
    const d = store.decideApproval(a.id, 'approved')
    expect(d).toMatchObject({ status: 'approved', decidedBy: 'human' })
    expect(d.decidedAt).toEqual(expect.any(String))
    expect(store.listAudit('run-1').map((e) => e.kind)).toContain('approval_decided')
  })
  it('refuses to decide twice, unknown ids and invalid decisions', () => {
    const a = approval(); store.putApproval(a); store.decideApproval(a.id, 'rejected')
    expect(() => store.decideApproval(a.id, 'approved')).toThrow(/not pending/)
    expect(() => store.decideApproval('missing', 'approved')).toThrow(/not pending/)
    const b = approval(); store.putApproval(b)
    expect(() => store.decideApproval(b.id, 'maybe' as 'approved')).toThrow(/invalid decision/)
  })
  it('throws after close', () => {
    store.close()
    expect(() => store.getRun('x')).toThrow()
    store = make()
  })
})

describe('openStore on disk', () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'themis-store-')) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) })

  it('creates parent dirs, uses WAL and persists across reopen', () => {
    const file = path.join(dir, 'nested', 'themis.db')
    const s1 = openStore(file)
    s1.saveRun(startRun('t', V, { runId: 'r1' }))
    expect(fs.existsSync(`${file}-wal`)).toBe(true)
    s1.close()
    const s2 = openStore(file)
    expect(s2.getRun('r1')?.task).toBe('t')
    s2.close()
  })
  it('makes audit_events append-only at the database level', () => {
    const file = path.join(dir, 'themis.db')
    const s = openStore(file); s.appendAudit(auditEvent('r1', 'step', {})); s.close()
    const raw = new (sqlite().DatabaseSync)(file)
    try {
      expect(() => raw.exec("UPDATE audit_events SET kind = 'error'")).toThrow(/append-only/)
      expect(() => raw.exec('DELETE FROM audit_events')).toThrow(/append-only/)
    } finally { raw.close() }
  })
  it('refuses a database written by a newer schema', () => {
    const file = path.join(dir, 'themis.db')
    openStore(file).close()
    const raw = new (sqlite().DatabaseSync)(file)
    raw.exec("INSERT INTO schema_migrations (version, applied_at) VALUES (999, 'x')")
    raw.close()
    expect(() => openStore(file)).toThrow(/newer/)
  })
  it('defaults to $THEMIS_HOME/themis.db, else ~/.themis', () => {
    const prev = process.env.THEMIS_HOME
    try {
      process.env.THEMIS_HOME = dir
      expect(themisHome()).toBe(path.resolve(dir))
      openStore().close()
      expect(fs.existsSync(path.join(dir, 'themis.db'))).toBe(true)
      delete process.env.THEMIS_HOME
      expect(themisHome()).toBe(path.join(os.homedir(), '.themis'))
    } finally {
      if (prev === undefined) delete process.env.THEMIS_HOME; else process.env.THEMIS_HOME = prev
    }
  })
})
