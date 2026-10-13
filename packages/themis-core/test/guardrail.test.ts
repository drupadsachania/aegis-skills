import { precheckSecrets, parseGuardrailVerdict, guardrailFailure, summariseGuardrail, synthesisableResults } from '../src/guardrail'
import type { SubTaskResult } from '../src/types'

const r = (over: Partial<SubTaskResult> = {}): SubTaskResult => ({
  subTaskId: 'st-1', skill: 's', findings: 'clean finding', confidence: 'high', guardrail: 'PASS', inputTokens: 0, outputTokens: 0, ...over,
})

it('precheck passes clean findings to the model (null) and force-BLOCKs secrets', () => {
  expect(precheckSecrets(r())).toBeNull()
  const out = precheckSecrets(r({ findings: 'key AKIAIOSFODNN7EXAMPLE' }))!
  expect(out).toMatchObject({ guardrail: 'BLOCK', guardrailReason: 'Sensitive data detected in finding' })
  expect(out.findings).toContain('[REDACTED]')
})
it('parses PASS without a reason and FLAG with one', () => {
  expect(parseGuardrailVerdict(r(), '{"verdict":"PASS","reason":"x"}')).toMatchObject({ guardrail: 'PASS', guardrailReason: undefined })
  expect(parseGuardrailVerdict(r(), '{"verdict":"FLAG","reason":"too detailed"}')).toMatchObject({ guardrail: 'FLAG', guardrailReason: 'too detailed' })
})
it('defaults to BLOCK on unparseable or unknown verdicts', () => {
  expect(parseGuardrailVerdict(r(), 'nope')).toMatchObject({ guardrail: 'BLOCK', guardrailReason: 'Guardrail response could not be parsed' })
  expect(parseGuardrailVerdict(r(), '{"verdict":"ALLOW"}')).toMatchObject({ guardrail: 'BLOCK', guardrailReason: undefined })
})
it('guardrailFailure blocks', () => {
  expect(guardrailFailure(r())).toMatchObject({ guardrail: 'BLOCK', guardrailReason: 'Guardrail check failed' })
})
it('summarises verdict counts', () => {
  expect(summariseGuardrail([r(), r({ guardrail: 'FLAG' }), r({ guardrail: 'BLOCK' }), r()])).toEqual({ passed: 2, flagged: 1, blocked: 1 })
})
it('synthesis excludes BLOCKed results', () => {
  expect(synthesisableResults([r(), r({ subTaskId: 'b', guardrail: 'BLOCK' })]).map((x) => x.subTaskId)).toEqual(['st-1'])
})
