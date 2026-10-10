import path from 'node:path'
import { createMemoryStore, ProviderUnavailableError, type ThemisStore } from '@aegis-skills/themis-core'
import { useTempHome, makeSkillPack } from '../helpers/fixtures'
import { ScriptedChatModel } from '../helpers/scripted-model'
import { fakeGatewayFactory, type FakeGatewayLog } from '../helpers/fake-gateway'
import { standardScript, type ScriptOptions } from '../helpers/test-deps'
import { setAegisRootForTests } from '../../src/versions'
import { setChatModelFactoryForTests } from '../../src/providers/models'
import { setConfigValue } from '../../src/config/config'
import { KeyStore } from '../../src/config/keys'
import { openAppDb, type AppDb } from '../../src/store/app-db'
import { SqliteCheckpointSaver } from '../../src/store/checkpointer'
import { ReportsRepo } from '../../src/store/reports'
import { RunEvents } from '../../src/runner/events'
import { RunGateways } from '../../src/graph/run-gateways'
import { executionState } from '../../src/approvals/execution'
import { Runner, BusyError, ConflictError, NotFoundError } from '../../src/runner/runner'
import type { ProviderId } from '../../src/providers/catalog'
import type { ToolMode } from '../../src/graph/skill-agent'

const PLAN = [
  { id: 'a', description: 'Check controls', skill: 'compliance', phase: 0, dependsOn: [] as string[] },
  { id: 'b', description: 'Model threats', skill: 'threat-modeling', phase: 0, dependsOn: ['a'] },
]
const TICKET = { when: /Check controls/, name: 'themis__fake__create_ticket', args: { title: 'x' } }

describe('Runner', () => {
  const dbs: AppDb[] = []
  const open = (file: string): AppDb => { const d = openAppDb(file); dbs.push(d); return d }
  // Registered before useTempHome so connections close before the temp dir is removed (Windows file locks).
  afterEach(() => { for (const d of dbs.splice(0)) { try { d.close() } catch { /* closed */ } } })
  const home = useTempHome()
  let store: ThemisStore
  let log: FakeGatewayLog
  let events: RunEvents
  let reports: ReportsRepo
  let appDbFile: string

  function makeRunner(o: { provider?: () => ProviderId; toolMode?: ToolMode; resolve?: (p?: string) => ProviderId; fresh?: boolean } = {}): Runner {
    const db = open(appDbFile)
    const fake = fakeGatewayFactory(store, log)
    return new Runner({
      ctx: { store, reports: new ReportsRepo(db), events, gateways: new RunGateways(fake.factory), toolMode: () => o.toolMode ?? 'tools' },
      checkpointer: new SqliteCheckpointSaver(db),
      versions: () => ({ themis: '0.1.0', aegis: '1.1.0', osk: '1.1' }),
      maxConcurrentRuns: () => 1,
      resolveProvider: o.resolve ?? ((p) => (p as ProviderId) ?? 'anthropic'),
    })
  }
  function script(o: Partial<ScriptOptions> = {}): void {
    setChatModelFactoryForTests(() => new ScriptedChatModel(standardScript({ plan: PLAN, ...o })))
  }

  beforeEach(() => {
    setAegisRootForTests(makeSkillPack([
      { name: 'compliance', phases: ['scope-definition', 'standard-mapping'] },
      { name: 'threat-modeling', phases: ['dfd'] },
    ]))
    new KeyStore().set('anthropic', 'sk-ant-test-000000')
    store = createMemoryStore()
    log = { executed: [], calls: [], listed: 0 }
    events = new RunEvents()
    appDbFile = path.join(home.dir(), 'app.db')
    reports = new ReportsRepo(open(appDbFile))
  })
  afterEach(() => {
    setChatModelFactoryForTests(null)
    setAegisRootForTests(null)
  })

  it('completes in dependency order and stamps the report', async () => {
    script()
    const runner = makeRunner()
    const { runId, done } = runner.start({ task: 'Assess our controls' })
    const run = await done
    expect(run.status).toBe('completed')
    expect(run.results.map((r) => r.subTaskId)).toEqual(['a', 'b'])
    expect(run.report).toContain('REPORT')
    const md = new ReportsRepo(open(appDbFile)).get(runId)!.markdown
    expect(md).toContain('Themis 0.1.0 · Aegis 1.1.0 (osk 1.1)')
    const h = events.history(runId).map((e) => e.event)
    const completedA = h.findIndex((e) => e.type === 'subtask' && e.subTaskId === 'a' && e.status === 'completed')
    const startedB = h.findIndex((e) => e.type === 'subtask' && e.subTaskId === 'b' && e.status === 'started')
    expect(completedA).toBeGreaterThanOrEqual(0)
    expect(completedA).toBeLessThan(startedB)
    const debrief = store.listAudit(runId).find((e) => e.kind === 'step' && (e.data as { debrief?: unknown }).debrief)
    const d = (debrief!.data as { debrief: { patternTags: unknown } }).debrief
    expect(Array.isArray(d.patternTags)).toBe(true)
    expect(JSON.stringify(debrief)).not.toContain('Check controls')
  })

  it('pauses for approval and resumes after a human approves', async () => {
    script({ toolCall: TICKET })
    const runner = makeRunner()
    const { runId, done } = runner.start({ task: 'Assess our controls' })
    const paused = await done
    expect(paused.status).toBe('awaiting_approval')
    const pending = store.listApprovals({ runId, status: 'pending' })
    expect(pending).toHaveLength(1)
    expect(store.getRun(runId)!.approvals).toContain(pending[0].id)
    store.decideApproval(pending[0].id, 'approved') // the test plays the human channel
    const fin = await (await runner.resume(runId)).done
    expect(fin.status).toBe('completed')
    expect(log.executed).toEqual([pending[0].id])
    expect(executionState(store, store.getApproval(pending[0].id)!)).toBe('executed')
    const md = new ReportsRepo(open(appDbFile)).get(runId)!.markdown
    expect(md).toContain('create_ticket')
    expect(md).toContain('approved / executed')
  })

  it('does not execute a rejected action', async () => {
    script({ toolCall: TICKET })
    const runner = makeRunner()
    const { runId, done } = runner.start({ task: 'Assess our controls' })
    expect((await done).status).toBe('awaiting_approval')
    const [a] = store.listApprovals({ runId, status: 'pending' })
    store.decideApproval(a.id, 'rejected')
    expect((await (await runner.resume(runId)).done).status).toBe('completed')
    expect(log.executed).toEqual([])
    expect(executionState(store, store.getApproval(a.id)!)).toBe('not_executed')
  })

  it('after a restart an approved action needs re-proposal and is not executed', async () => {
    script({ toolCall: TICKET })
    const first = makeRunner()
    const { runId, done } = first.start({ task: 'Assess our controls' })
    expect((await done).status).toBe('awaiting_approval')
    const [a] = store.listApprovals({ runId, status: 'pending' })
    store.decideApproval(a.id, 'approved')
    const second = makeRunner() // new gateways (empty raw args), new checkpointer connection, same store
    const fin = await (await second.resume(runId)).done
    expect(fin.status).toBe('completed')
    expect(log.executed).toEqual([])
    expect(executionState(store, store.getApproval(a.id)!)).toBe('needs_reproposal')
    const body = new ReportsRepo(open(appDbFile)).get(runId)!.body as { approvalOutcomes: Array<{ findings: string }> }
    expect(body.approvalOutcomes[0].findings).toContain('proposed again')
  })

  it('runs without tools for a local model with no verified tool calling', async () => {
    setConfigValue('local.model', 'llama3.1:8b')
    script()
    const runner = makeRunner({ resolve: () => 'local', toolMode: 'no-tools' })
    const { runId, done } = runner.start({ task: 'Assess our controls' })
    expect((await done).status).toBe('completed')
    expect(log.listed).toBe(0)
    expect(events.history(runId).some((e) => e.event.type === 'notice')).toBe(true)
  })

  it('fails a run whose task is rejected by validation', async () => {
    script()
    const runner = makeRunner()
    const run = await runner.start({ task: '<script>x</script>' }).done
    expect(run.status).toBe('failed')
    expect(run.error).toMatch(/disallowed/)
  })

  it('rejects a second concurrent run', async () => {
    script()
    const runner = makeRunner()
    const first = runner.start({ task: 'Assess our controls' })
    expect(() => runner.start({ task: 'Another task' })).toThrow(BusyError)
    await first.done
  })

  it('refuses to start when no provider is available and saves nothing', () => {
    script()
    const runner = makeRunner({ resolve: () => { throw new ProviderUnavailableError('none') } })
    expect(() => runner.start({ task: 'Assess our controls' })).toThrow(ProviderUnavailableError)
    expect(store.listRuns()).toHaveLength(0)
  })

  it('enforces resume rules', async () => {
    script({ toolCall: TICKET })
    const runner = makeRunner()
    await expect(runner.resume('nope')).rejects.toBeInstanceOf(NotFoundError)
    const { runId, done } = runner.start({ task: 'Assess our controls' })
    expect((await done).status).toBe('awaiting_approval')
    await expect(runner.resume(runId)).rejects.toBeInstanceOf(ConflictError) // pending approval
    const [a] = store.listApprovals({ runId, status: 'pending' })
    store.decideApproval(a.id, 'rejected')
    await (await runner.resume(runId)).done
    await expect(runner.resume(runId)).rejects.toBeInstanceOf(ConflictError) // completed
  })

  // reports is only used to make sure app.db exists before the runners open it
  it('creates app.db up front', () => { expect(reports).toBeDefined() })
})
