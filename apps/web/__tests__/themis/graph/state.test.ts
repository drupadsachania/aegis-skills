import type { SubTask, SubTaskResult } from '@/lib/themis/types'

// We test reducer behaviour directly — import the annotation and exercise
// the reducer functions by simulating what LangGraph does when merging state.
// LangGraph stores reducers under `channel.operator` and defaults under
// `channel.initialValueFactory` (not `.reducer` / `.default`).

describe('ThemisAnnotation reducers', () => {
  let ann: ReturnType<typeof import('@/lib/themis/graph/state')['getAnnotation']>

  beforeEach(async () => {
    const mod = await import('@/lib/themis/graph/state')
    ann = mod.getAnnotation()
  })

  const mockSubTask = (id: string): SubTask => ({
    id,
    description: `task-${id}`,
    skill: 'mitre-attack',
    phase: 0,
    tier: 'fast',
    dependsOn: [],
  })

  const mockResult = (id: string): SubTaskResult => ({
    subTaskId: id,
    skill: 'mitre-attack',
    findings: `findings-${id}`,
    confidence: 'high',
    guardrail: 'PASS',
    inputTokens: 10,
    outputTokens: 20,
  })

  it('subTasks: append reducer concatenates arrays', () => {
    const channel = ann.spec.subTasks
    const result = channel.operator([mockSubTask('a')], [mockSubTask('b')])
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('a')
    expect(result[1].id).toBe('b')
  })

  it('subTasks: default is empty array', () => {
    const channel = ann.spec.subTasks
    // All channels in ThemisAnnotation are declared with a `default` factory
    expect(channel.initialValueFactory).toBeDefined()
    expect(channel.initialValueFactory!()).toEqual([])
  })

  it('subTaskResults: append reducer concatenates arrays', () => {
    const channel = ann.spec.subTaskResults
    const result = channel.operator([mockResult('a')], [mockResult('b')])
    expect(result).toHaveLength(2)
  })

  it('guardrailedResults: append reducer concatenates arrays', () => {
    const channel = ann.spec.guardrailedResults
    const result = channel.operator([mockResult('a')], [mockResult('b')])
    expect(result).toHaveLength(2)
  })

  it('totalInputTokens: sum reducer accumulates', () => {
    const channel = ann.spec.totalInputTokens
    expect(channel.operator(100, 200)).toBe(300)
    expect(channel.operator(0, 50)).toBe(50)
  })

  it('totalOutputTokens: sum reducer accumulates', () => {
    const channel = ann.spec.totalOutputTokens
    expect(channel.operator(10, 15)).toBe(25)
  })

  it('report: last-write-wins', () => {
    const channel = ann.spec.report
    expect(channel.operator('old', 'new')).toBe('new')
  })

  it('task: last-write-wins', () => {
    const channel = ann.spec.task
    expect(channel.operator('old-task', 'new-task')).toBe('new-task')
  })

  it('skillTrace: deduplicating union', () => {
    const channel = ann.spec.skillTrace
    const result = channel.operator(['a', 'b'], ['b', 'c'])
    expect(result).toEqual(expect.arrayContaining(['a', 'b', 'c']))
    expect(result).toHaveLength(3)
  })

  it('context: last-write-wins', () => {
    const channel = ann.spec.context
    const prev = { environments: ['aws'], attackSurfaceTags: ['web'] }
    const next = { environments: ['gcp'], attackSurfaceTags: ['api'] }
    expect(channel.operator(prev, next)).toEqual(next)
  })

  it('provider: last-write-wins', () => {
    const channel = ann.spec.provider
    expect(channel.operator('anthropic', 'openai')).toBe('openai')
    expect(channel.operator('anthropic', undefined)).toBeUndefined()
  })

  it('currentSubTask: last-write-wins', () => {
    const channel = ann.spec.currentSubTask
    const task = mockSubTask('x')
    expect(channel.operator(undefined, task)).toEqual(task)
    expect(channel.operator(task, undefined)).toBeUndefined()
  })

  it('guardrailSummary: last-write-wins', () => {
    const channel = ann.spec.guardrailSummary
    const prev = { passed: 1, flagged: 0, blocked: 0 }
    const next = { passed: 2, flagged: 1, blocked: 0 }
    expect(channel.operator(prev, next)).toEqual(next)
  })

  it('startTime: first-write-wins (non-zero value preserved)', () => {
    const channel = ann.spec.startTime
    // Once set to a non-zero value, subsequent writes must NOT overwrite it
    expect(channel.operator(1000, 9999)).toBe(1000)
    // Zero prev yields to next (initial set)
    expect(channel.operator(0, 1000)).toBe(1000)
  })

  it('durationMs: last-write-wins', () => {
    const channel = ann.spec.durationMs
    expect(channel.operator(100, 500)).toBe(500)
  })
})
