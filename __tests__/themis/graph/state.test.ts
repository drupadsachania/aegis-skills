import type { SubTask, SubTaskResult } from '@/lib/themis/types'

// We test reducer behaviour directly — import the annotation and exercise
// the reducer functions by simulating what LangGraph does when merging state.

describe('ThemisAnnotation reducers', () => {
  let ThemisAnnotation: Awaited<ReturnType<typeof import('@/lib/themis/graph/state')['getAnnotation']>>

  beforeEach(async () => {
    const mod = await import('@/lib/themis/graph/state')
    ThemisAnnotation = mod.getAnnotation()
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
    const spec = ThemisAnnotation.spec.subTasks
    const result = spec.reducer([mockSubTask('a')], [mockSubTask('b')])
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('a')
    expect(result[1].id).toBe('b')
  })

  it('subTasks: default is empty array', () => {
    const spec = ThemisAnnotation.spec.subTasks
    expect(spec.default!()).toEqual([])
  })

  it('subTaskResults: append reducer concatenates arrays', () => {
    const spec = ThemisAnnotation.spec.subTaskResults
    const result = spec.reducer([mockResult('a')], [mockResult('b')])
    expect(result).toHaveLength(2)
  })

  it('guardrailedResults: append reducer concatenates arrays', () => {
    const spec = ThemisAnnotation.spec.guardrailedResults
    const result = spec.reducer([mockResult('a')], [mockResult('b')])
    expect(result).toHaveLength(2)
  })

  it('totalInputTokens: sum reducer accumulates', () => {
    const spec = ThemisAnnotation.spec.totalInputTokens
    expect(spec.reducer(100, 200)).toBe(300)
    expect(spec.reducer(0, 50)).toBe(50)
  })

  it('totalOutputTokens: sum reducer accumulates', () => {
    const spec = ThemisAnnotation.spec.totalOutputTokens
    expect(spec.reducer(10, 15)).toBe(25)
  })

  it('report: last-write-wins', () => {
    const spec = ThemisAnnotation.spec.report
    expect(spec.reducer('old', 'new')).toBe('new')
  })

  it('task: last-write-wins', () => {
    const spec = ThemisAnnotation.spec.task
    expect(spec.reducer('old-task', 'new-task')).toBe('new-task')
  })

  it('skillTrace: deduplicating union', () => {
    const spec = ThemisAnnotation.spec.skillTrace
    const result = spec.reducer(['a', 'b'], ['b', 'c'])
    expect(result).toEqual(expect.arrayContaining(['a', 'b', 'c']))
    expect(result).toHaveLength(3)
  })
})
