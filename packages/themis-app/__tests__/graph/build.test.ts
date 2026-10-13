import { createMemoryStore, THEMIS_WORKFLOW, LANGGRAPH_NODE_BY_STEP } from '@aegis-skills/themis-core'
import { edgesFor, buildThemisGraph } from '../../src/graph/build'
import { RunGateways } from '../../src/graph/run-gateways'
import { RunEvents } from '../../src/runner/events'
import { ReportsRepo } from '../../src/store/reports'
import { openAppDb } from '../../src/store/app-db'
import { SqliteCheckpointSaver } from '../../src/store/checkpointer'
import { fakeGatewayFactory } from '../helpers/fake-gateway'

describe('graph built from THEMIS_WORKFLOW', () => {
  it('wires exactly the workflow edges', () => {
    const byFrom = (a: { from: string }, b: { from: string }) => a.from.localeCompare(b.from)
    const got = edgesFor().map((e) => ({ from: e.from, to: e.to, conditional: !!e.conditional })).sort(byFrom)
    const want = [
      { from: '__start__', to: ['validate'], conditional: false },
      { from: 'validate', to: ['decompose'], conditional: false },
      { from: 'decompose', to: ['schedule'], conditional: false },
      { from: 'schedule', to: ['skill-agent', 'guardrail'], conditional: true },
      { from: 'skill-agent', to: ['schedule'], conditional: false },
      { from: 'guardrail', to: ['synthesise'], conditional: false },
      { from: 'synthesise', to: ['audit'], conditional: false },
      { from: 'audit', to: ['__end__'], conditional: false },
    ].sort(byFrom)
    expect(got).toEqual(want)
  })

  it('has a node for every workflow step', () => {
    const froms = new Set(edgesFor().map((e) => e.from))
    froms.delete('__start__')
    expect([...froms].sort()).toEqual(Object.values(LANGGRAPH_NODE_BY_STEP).sort())
  })

  it('rejects unsupported branching', () => {
    const wf = {
      ...THEMIS_WORKFLOW,
      steps: { ...THEMIS_WORKFLOW.steps, guardrail: { ...THEMIS_WORKFLOW.steps.guardrail, next: ['synthesise', 'audit'] as never } },
    }
    expect(() => edgesFor(wf as typeof THEMIS_WORKFLOW)).toThrow(/Unsupported branching/)
  })

  it('compiles', () => {
    const store = createMemoryStore()
    const db = openAppDb(':memory:')
    const ctx = {
      store, reports: new ReportsRepo(db), events: new RunEvents(),
      gateways: new RunGateways(fakeGatewayFactory(store).factory), toolMode: () => 'tools' as const,
    }
    expect(() => buildThemisGraph(ctx, new SqliteCheckpointSaver(db))).not.toThrow()
    db.close()
  })
})
