import { parseStepInput } from '../src/step-io'

describe('parseStepInput', () => {
  it('accepts a valid decompose payload and defaults phase/dependsOn', () => {
    const out = parseStepInput('decompose', { subTasks: [{ id: 's1', skill: 'attack-surface-mapping', description: 'enumerate' }] })
    expect(out.subTasks[0]).toMatchObject({ phase: 0, dependsOn: [] })
  })
  it('rejects decompose with an unknown key or non-string skill', () => {
    expect(() => parseStepInput('decompose', { subTasks: [{ id: 's', skill: 'a', description: 'd' }], extra: 1 })).toThrow()
    expect(() => parseStepInput('decompose', { subTasks: [{ id: 's1', skill: 5, description: 't' }] })).toThrow()
  })
  it('accepts fanout, guardrail and synthesise payloads', () => {
    expect(parseStepInput('fanout', { results: [{ subTaskId: 's1', findings: 'x' }] }).results[0].confidence).toBe('low')
    expect(parseStepInput('guardrail', { results: [{ subTaskId: 's1', guardrail: 'PASS' }] }).results).toHaveLength(1)
    expect(parseStepInput('synthesise', { report: 'ok' }).report).toBe('ok')
  })
  it('rejects bad guardrail verdicts and unknown steps', () => {
    expect(() => parseStepInput('guardrail', { results: [{ subTaskId: 's1', guardrail: 'pass' }] })).toThrow()
    expect(() => parseStepInput('nope' as 'decompose', {})).toThrow(/unknown reasoning step/)
  })
})
