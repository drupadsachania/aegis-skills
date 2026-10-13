import { THEMIS_WORKFLOW, LANGGRAPH_NODE_BY_STEP, startRun, advance } from '../src/workflow'
import { readySubTasks } from '../src/schedule'
import { MAX_SUBTASKS } from '../src/planning'
import type { RunState, StepId } from '../src/contracts'

const V = { themis: '0.1.0', aegis: '1.1.0', osk: '1.1' }
const SLUGS = ['mitre-attack', 'threat-modeling']
const ctx = { environments: ['web'], attackSurfaceTags: ['api'] }
function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v) }
  return o
}
function ok(run: RunState, id: StepId, output?: unknown) {
  const r = advance(deepFreeze(run), id, output)
  expect(r.error).toBeUndefined()
  return r
}
const plan2 = { skillSlugs: SLUGS, subTasks: [
  { id: 'a', description: 'recon', skill: 'mitre-attack', phase: 0, dependsOn: [] },
  { id: 'b', description: 'model', skill: 'threat-modeling', phase: 0, dependsOn: ['a'] },
] }
function toFanout(): RunState {
  let r = ok(startRun('Assess the bastion', V, { context: ctx }), 'validate')
  r = ok(r.run, 'decompose', plan2)
  return ok(r.run, 'schedule').run
}

describe('THEMIS_WORKFLOW', () => {
  it('starts at validate; audit is the only terminal step', () => {
    expect(THEMIS_WORKFLOW.start).toBe('validate')
    const terminal = Object.values(THEMIS_WORKFLOW.steps).filter((s) => s.next.length === 0).map((s) => s.id)
    expect(terminal).toEqual(['audit'])
  })
  it('every transition targets a defined step and every step is reachable', () => {
    const ids = Object.keys(THEMIS_WORKFLOW.steps)
    const seen = new Set<string>([THEMIS_WORKFLOW.start])
    const queue: StepId[] = [THEMIS_WORKFLOW.start]
    while (queue.length) for (const n of THEMIS_WORKFLOW.steps[queue.shift()!].next) {
      expect(ids).toContain(n)
      if (!seen.has(n)) { seen.add(n); queue.push(n) }
    }
    expect([...seen].sort()).toEqual([...ids].sort())
  })
  it('classifies steps and mirrors the LangGraph nodes', () => {
    expect(Object.fromEntries(Object.values(THEMIS_WORKFLOW.steps).map((s) => [s.id, s.kind]))).toEqual({
      validate: 'deterministic', decompose: 'reasoning', schedule: 'deterministic', fanout: 'reasoning',
      guardrail: 'reasoning', synthesise: 'reasoning', audit: 'deterministic',
    })
    expect(LANGGRAPH_NODE_BY_STEP).toEqual({ validate: 'validate', decompose: 'decompose', schedule: 'schedule', fanout: 'skill-agent', guardrail: 'guardrail', synthesise: 'synthesise', audit: 'audit' })
    expect(THEMIS_WORKFLOW.steps.schedule.next).toEqual(['fanout', 'guardrail'])
    expect(THEMIS_WORKFLOW.steps.fanout.next).toEqual(['schedule'])
  })
  it('is immutable', () => {
    expect(Object.isFrozen(THEMIS_WORKFLOW)).toBe(true)
    expect(Object.isFrozen(THEMIS_WORKFLOW.steps.schedule.next)).toBe(true)
  })
})

it('startRun creates a running run at validate with versions stamped', () => {
  const run = startRun('t', V, { runId: 'r1', now: '2026-10-07T00:00:00.000Z' })
  expect(run).toEqual({
    runId: 'r1', task: 't', step: 'validate', status: 'running', subTasks: [], results: [], findings: [], approvals: [],
    versions: V, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z',
    context: { environments: [], attackSurfaceTags: [] }, report: null, error: null,
  })
})

it('runs the full dependency-staged path to completion', () => {
  let run = toFanout()
  expect(run.step).toBe('fanout')
  expect(readySubTasks(run).map((t) => t.id)).toEqual(['a'])
  let r = ok(run, 'fanout', { results: [{ subTaskId: 'a', findings: 'ssh open', confidence: 'high' }] })
  expect(r.next).toBe('schedule')
  r = ok(r.run, 'schedule'); expect(r.next).toBe('fanout')
  expect(readySubTasks(r.run).map((t) => t.id)).toEqual(['b'])
  r = ok(r.run, 'fanout', { results: [{ subTaskId: 'b', findings: 'model', confidence: 'medium' }] })
  r = ok(r.run, 'schedule'); expect(r.next).toBe('guardrail')
  r = ok(r.run, 'guardrail', { results: [{ subTaskId: 'a', guardrail: 'PASS', guardrailReason: 'x' }, { subTaskId: 'b', guardrail: 'FLAG', guardrailReason: 'too detailed' }] })
  expect(r.run.results.map((x) => [x.guardrail, x.guardrailReason])).toEqual([['PASS', undefined], ['FLAG', 'too detailed']])
  expect(r.next).toBe('synthesise')
  r = ok(r.run, 'synthesise', { report: 'Report' }); expect(r.next).toBe('audit')
  r = ok(r.run, 'audit'); expect(r.next).toBeNull()
  expect(r.run.status).toBe('completed')
  run = r.run
  expect(advance(run, 'audit', undefined).error).toMatch(/completed/)
})
it('an empty plan goes straight from schedule to guardrail (as the graph does)', () => {
  let r = ok(startRun('t', V), 'validate')
  r = ok(r.run, 'decompose', { skillSlugs: SLUGS, subTasks: [] })
  r = ok(r.run, 'schedule'); expect(r.next).toBe('guardrail')
  r = ok(r.run, 'guardrail', { results: [] }); expect(r.next).toBe('synthesise')
})
it('rejects out-of-order steps without changing the run', () => {
  const run = deepFreeze(startRun('t', V))
  const r = advance(run, 'decompose', plan2)
  expect(r.error).toMatch(/expected step "validate"/)
  expect(r.run).toBe(run)
  expect(r.next).toBe('validate')
})
it('fails the run when validation rejects the task', () => {
  const r = advance(startRun('<script>x</script>', V), 'validate', undefined)
  expect(r.run.status).toBe('failed')
  expect(r.run.error).toMatch(/disallowed/)
  expect(r.next).toBeNull()
})
it('decompose normalises the plan (unknown skills dropped, capped)', () => {
  let r = ok(startRun('t', V), 'validate')
  const many = Array.from({ length: MAX_SUBTASKS + 3 }, (_, i) => ({ id: `s${i}`, description: 'd', skill: i === 0 ? 'made-up' : 'mitre-attack', phase: 0, dependsOn: [] }))
  r = ok(r.run, 'decompose', { skillSlugs: SLUGS, subTasks: many })
  expect(r.run.subTasks).toHaveLength(MAX_SUBTASKS)
  expect(r.run.subTasks.some((t) => t.skill === 'made-up')).toBe(false)
  expect(advance(r.run, 'schedule', undefined).error).toBeUndefined()
})
it('fanout rejects results for sub-tasks that are not ready, leaving the run retryable', () => {
  const run = toFanout()
  const r = advance(deepFreeze(run), 'fanout', { results: [{ subTaskId: 'b', findings: 'early' }, { subTaskId: 'ghost', findings: 'x' }] })
  expect(r.error).toMatch(/no result for a ready sub-task/)
  expect(r.run).toBe(run)
  expect(r.run.status).toBe('running')
})
it('fanout redacts findings and ignores model-supplied verdicts', () => {
  const r = ok(toFanout(), 'fanout', { results: [{ subTaskId: 'a', findings: 'key AKIAIOSFODNN7EXAMPLE', guardrail: 'BLOCK', confidence: 'bogus' }] })
  expect(r.run.results[0]).toMatchObject({ skill: 'mitre-attack', guardrail: 'PASS', confidence: 'low' })
  expect(r.run.results[0].findings).toContain('[REDACTED]')
})
it('guardrail requires a verdict for every result and fails closed on unknown verdicts', () => {
  let r = ok(toFanout(), 'fanout', { results: [{ subTaskId: 'a', findings: 'f' }] })
  r = ok(r.run, 'schedule')
  r = ok(r.run, 'fanout', { results: [{ subTaskId: 'b', findings: 'f' }] })
  r = ok(r.run, 'schedule')
  expect(advance(r.run, 'guardrail', { results: [{ subTaskId: 'a', guardrail: 'PASS' }] }).error).toMatch(/missing sub-task b/)
  const g = ok(r.run, 'guardrail', { results: [{ subTaskId: 'a', guardrail: 'ALLOW' }, { subTaskId: 'b', guardrail: 'PASS' }] })
  expect(g.run.results[0].guardrail).toBe('BLOCK')
})
it('synthesise requires a string report and redacts it', () => {
  let r = ok(startRun('t', V), 'validate')
  r = ok(r.run, 'decompose', { skillSlugs: SLUGS, subTasks: [] })
  r = ok(r.run, 'schedule')
  r = ok(r.run, 'guardrail', { results: [] })
  expect(advance(r.run, 'synthesise', { report: 42 }).error).toMatch(/report must be a string/)
  r = ok(r.run, 'synthesise', { report: 'contact bob@example.com' })
  expect(r.run.report).toBe('contact [REDACTED]')
})
