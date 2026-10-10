// Unit tests for the sub-agent spin-up logic added in this pass:
// fanOutNode (dependency-aware scheduler). Planner limits are tested in themis-core.

jest.mock('@/lib/themis/provider', () => ({ llm: jest.fn() }))

import { fanOutNode } from '@/lib/themis/graph/nodes'
import { Send } from '@langchain/langgraph'
import type { SubTask, SubTaskResult } from '@aegis-skills/themis-core'
import type { ThemisState } from '@/lib/themis/graph/state'

function st(id: string, skill: string, dependsOn: string[] = []): SubTask {
  return { id, description: `task ${id}`, skill, phase: 0, tier: 'fast', dependsOn }
}

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
