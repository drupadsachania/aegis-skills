import { normaliseSubTasks, MAX_SUBTASKS, assignTier, coerceSubTasks, parseDecomposeResponse } from '../src/planning'
import type { SubTask } from '../src/types'

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

describe('assignTier', () => {
  it('applies skill overrides, then phase count', () => {
    expect(assignTier(1, 'malware-analysis')).toBe('power')
    expect(assignTier(9, 'compliance')).toBe('fast')
    expect(assignTier(2)).toBe('fast')
    expect(assignTier(5)).toBe('standard')
    expect(assignTier(6)).toBe('power')
  })
})

describe('parseDecomposeResponse / coerceSubTasks', () => {
  it('maps planner JSON to SubTasks with assigned tiers', () => {
    const out = parseDecomposeResponse(JSON.stringify([{ id: 'st-1', description: 'd', skill: 'threat-modeling', phase: 0, dependsOn: [] }]))
    expect(out).toEqual([{ id: 'st-1', description: 'd', skill: 'threat-modeling', phase: 0, tier: 'power', dependsOn: [] }])
  })
  it('throws on a non-array response and on non-object items', () => {
    expect(() => parseDecomposeResponse('{}')).toThrow('Decompose response is not an array')
    expect(() => coerceSubTasks([1])).toThrow('SubTask item is not an object')
  })
  it('defaults missing fields', () => {
    expect(coerceSubTasks([{}])[0]).toEqual({ id: '', description: '', skill: '', phase: 0, tier: 'fast', dependsOn: [] })
  })
})
