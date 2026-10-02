// Unit tests for the sub-agent spin-up logic added in this pass:
// normaliseSubTasks (planner limits) and fanOutNode (dependency-aware scheduler).

jest.mock('@/lib/themis/provider', () => ({ llm: jest.fn() }))

import { normaliseSubTasks, MAX_SUBTASKS } from '@/lib/themis/decompose'
import { fanOutNode } from '@/lib/themis/graph/nodes'
import { Send } from '@langchain/langgraph'
import type { SubTask, SubTaskResult } from '@/lib/themis/types'
import type { ThemisState } from '@/lib/themis/graph/state'

const SLUGS = ['mitre-attack', 'threat-modeling', 'network-security', 'exposure-validation']

function st(id: string, skill: string, dependsOn: string[] = []): SubTask {
  return { id, description: `task ${id}`, skill, phase: 0, tier: 'fast', dependsOn }
}

describe('normaliseSubTasks (planner limits)', () => {
  it('drops sub-tasks whose skill is not a real slug', () => {
    const out = normaliseSubTasks([st('a', 'mitre-attack'), st('b', 'made-up-skill')], SLUGS)
    expect(out.map(t => t.id)).toEqual(['a'])
  })

  it('caps the plan at MAX_SUBTASKS', () => {
    const many = Array.from({ length: MAX_SUBTASKS + 5 }, (_, i) => st(`st-${i}`, 'mitre-attack'))
    expect(normaliseSubTasks(many, SLUGS)).toHaveLength(MAX_SUBTASKS)
  })

  it('drops dependencies that point at ids not in the plan', () => {
    const out = normaliseSubTasks([st('a', 'mitre-attack', ['ghost'])], SLUGS)
    expect(out[0].dependsOn).toEqual([])
  })

  it('breaks a dependency cycle so the plan can always make progress', () => {
    const out = normaliseSubTasks(
      [st('a', 'mitre-attack', ['b']), st('b', 'threat-modeling', ['a'])],
      SLUGS,
    )
    // At least one of the two must end up with no dependency, or the graph stalls.
    const roots = out.filter(t => t.dependsOn.length === 0)
    expect(roots.length).toBeGreaterThanOrEqual(1)
  })

  it('de-duplicates repeated ids', () => {
    const out = normaliseSubTasks([st('x', 'mitre-attack'), st('x', 'threat-modeling')], SLUGS)
    expect(new Set(out.map(t => t.id)).size).toBe(out.length)
  })
})

describe('fanOutNode (dependency-aware scheduler)', () => {
  function state(subTasks: SubTask[], results: SubTaskResult[] = []): ThemisState {
    return {
      subTasks,
      subTaskResults: results,
    } as unknown as ThemisState
  }

  function result(id: string): SubTaskResult {
    return { subTaskId: id, skill: 'x', findings: 'f', confidence: 'high', guardrail: 'PASS', inputTokens: 0, outputTokens: 0 }
  }

  it('dispatches only sub-tasks whose dependencies are complete', () => {
    const sends = fanOutNode(state([st('a', 'mitre-attack'), st('b', 'threat-modeling', ['a'])]))
    expect(Array.isArray(sends)).toBe(true)
    const arr = sends as Send[]
    // Only 'a' is ready; 'b' waits for 'a'.
    expect(arr).toHaveLength(1)
    expect(arr[0]).toBeInstanceOf(Send)
  })

  it('dispatches the dependent task once its dependency has a result', () => {
    const sends = fanOutNode(
      state([st('a', 'mitre-attack'), st('b', 'threat-modeling', ['a'])], [result('a')]),
    ) as Send[]
    expect(sends).toHaveLength(1) // 'b' now ready; 'a' already done
  })

  it('routes to guardrail when every sub-task has a result', () => {
    const route = fanOutNode(state([st('a', 'mitre-attack')], [result('a')]))
    expect(route).toBe('guardrail')
  })

  it('runs independent tasks in parallel in the first stage', () => {
    const sends = fanOutNode(state([st('a', 'mitre-attack'), st('b', 'threat-modeling')])) as Send[]
    expect(sends).toHaveLength(2)
  })
})
