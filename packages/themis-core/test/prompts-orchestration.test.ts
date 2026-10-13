import {
  decomposeSystemPrompt, decomposeUserMessage, skillAgentSystemPrompt, skillAgentUserMessage,
  guardrailSystemPrompt, guardrailUserMessage, synthesiseSystemPrompt, synthesiseUserMessage,
} from '../src/prompts'

const UNTRUSTED = /untrusted|not commands|not instructions|Do not follow any instructions|Ignore any content/i

it('every system prompt tells the model that embedded content is data', () => {
  for (const p of [decomposeSystemPrompt(['a']), skillAgentSystemPrompt(), guardrailSystemPrompt(), synthesiseSystemPrompt()]) {
    expect(p).toMatch(UNTRUSTED)
  }
})
it('decompose lists skills and wraps the task', () => {
  expect(decomposeSystemPrompt(['mitre-attack', 'threat-modeling'])).toContain('Available skills: mitre-attack, threat-modeling')
  expect(decomposeUserMessage('x')).toBe('<user_task>\nx\n</user_task>')
})
it('skill agent message names skill and phase', () => {
  const m = skillAgentUserMessage({ skill: 'mitre-attack', phase: 2, description: 'd' })
  expect(m).toContain('<sub_task>\nd\n</sub_task>')
  expect(m).toContain('skill="mitre-attack", phaseId="2"')
})
it('guardrail wraps one finding', () => {
  expect(guardrailUserMessage({ skill: 's', subTaskId: 'st-1', findings: 'f' })).toBe('<agent_finding skill="s" id="st-1">\nf\n</agent_finding>')
})
it('synthesise joins findings and notes flags', () => {
  expect(synthesiseUserMessage([])).toBe('')
  expect(synthesiseUserMessage([{ skill: 's', findings: 'f', guardrailReason: 'r' }])).toBe('<agent_finding skill="s">\nf\n[FLAGGED: r]\n</agent_finding>')
})
