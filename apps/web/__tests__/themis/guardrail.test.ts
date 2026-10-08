// Mock the provider module
jest.mock('@/lib/themis/provider', () => ({
  llm: jest.fn(),
}))

import { applyGuardrail } from '@/lib/themis/guardrail'
import { llm } from '@/lib/themis/provider'
import { SubTaskResult } from '@/lib/themis/types'

const mockLlm = llm as jest.MockedFunction<typeof llm>

function makeResult(overrides: Partial<SubTaskResult> = {}): SubTaskResult {
  return {
    subTaskId: 'st-1',
    skill: 'auth-bypass',
    findings: 'The authentication endpoint is vulnerable to timing attacks.',
    confidence: 'high',
    guardrail: 'PASS',
    inputTokens: 10,
    outputTokens: 20,
    ...overrides,
  }
}

function makeLlmVerdict(verdict: string, reason?: string) {
  return Promise.resolve({
    content: JSON.stringify({ verdict, reason }),
    model: 'claude-haiku-4-5-20251001',
    provider: 'anthropic' as const,
    inputTokens: 5,
    outputTokens: 10,
    latencyMs: 50,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('applyGuardrail', () => {
  test('PASS verdict: result passes through with guardrail: PASS, no guardrailReason', async () => {
    mockLlm.mockResolvedValue(await makeLlmVerdict('PASS'))

    const input = makeResult()
    const result = await applyGuardrail(input)

    expect(result.guardrail).toBe('PASS')
    expect(result.guardrailReason).toBeUndefined()
    // Original fields preserved
    expect(result.findings).toBe(input.findings)
    expect(result.subTaskId).toBe('st-1')
  })

  test('FLAG verdict: result has guardrail: FLAG, guardrailReason appended', async () => {
    mockLlm.mockResolvedValue(await makeLlmVerdict('FLAG', 'Contains overly detailed exploit instructions'))

    const result = await applyGuardrail(makeResult())

    expect(result.guardrail).toBe('FLAG')
    expect(result.guardrailReason).toBe('Contains overly detailed exploit instructions')
  })

  test('BLOCK verdict: result has guardrail: BLOCK', async () => {
    mockLlm.mockResolvedValue(await makeLlmVerdict('BLOCK', 'Finding contains harmful content'))

    const result = await applyGuardrail(makeResult())

    expect(result.guardrail).toBe('BLOCK')
    expect(result.guardrailReason).toBe('Finding contains harmful content')
  })

  test('secrets in findings → force BLOCK before any LLM call (LLM should NOT be called)', async () => {
    const findings = 'Found AWS key AKIAIOSFODNN7EXAMPLE in config file'
    const input = makeResult({ findings })

    const result = await applyGuardrail(input)

    // LLM must not be called
    expect(mockLlm).not.toHaveBeenCalled()
    expect(result.guardrail).toBe('BLOCK')
    expect(result.guardrailReason).toContain('Sensitive data')
    // Findings should be redacted
    expect(result.findings).not.toContain('AKIAIOSFODNN7EXAMPLE')
    expect(result.findings).toContain('[REDACTED]')
  })

  test('email in findings → force BLOCK before any LLM call', async () => {
    const findings = 'Found admin credentials for admin@internal.company.com'
    const input = makeResult({ findings })

    const result = await applyGuardrail(input)

    expect(mockLlm).not.toHaveBeenCalled()
    expect(result.guardrail).toBe('BLOCK')
  })

  test('LLM JSON parse failure → default to BLOCK', async () => {
    mockLlm.mockResolvedValue({
      content: 'not valid json at all!!!',
      model: 'claude-haiku-4-5-20251001',
      provider: 'anthropic',
      inputTokens: 5,
      outputTokens: 5,
      latencyMs: 10,
    })

    const result = await applyGuardrail(makeResult())

    expect(result.guardrail).toBe('BLOCK')
    expect(result.guardrailReason).toContain('could not be parsed')
  })

  test('LLM call failure → default to BLOCK', async () => {
    mockLlm.mockRejectedValue(new Error('LLM timeout'))

    const result = await applyGuardrail(makeResult())

    expect(result.guardrail).toBe('BLOCK')
    expect(result.guardrailReason).toContain('failed')
  })

  test('PASS verdict with no reason: guardrailReason is undefined', async () => {
    mockLlm.mockResolvedValue(await makeLlmVerdict('PASS'))

    const result = await applyGuardrail(makeResult())
    expect(result.guardrailReason).toBeUndefined()
  })

  test('FLAG verdict with no reason: guardrailReason is undefined', async () => {
    // No reason provided — parsed.reason will be absent
    mockLlm.mockResolvedValue({
      content: JSON.stringify({ verdict: 'FLAG' }),
      model: 'test',
      provider: 'anthropic',
      inputTokens: 5,
      outputTokens: 5,
      latencyMs: 10,
    })

    const result = await applyGuardrail(makeResult())
    expect(result.guardrail).toBe('FLAG')
    expect(result.guardrailReason).toBeUndefined()
  })

  test('unrecognised verdict string defaults to BLOCK', async () => {
    mockLlm.mockResolvedValue({
      content: JSON.stringify({ verdict: 'ALLOW', reason: 'custom verdict' }),
      model: 'test',
      provider: 'anthropic',
      inputTokens: 5,
      outputTokens: 5,
      latencyMs: 10,
    })

    const result = await applyGuardrail(makeResult())
    // 'ALLOW' is not PASS/FLAG/BLOCK — but the code checks for these exactly
    // The code sets verdict = v only if v === 'PASS' || 'FLAG' || 'BLOCK'
    // If v is 'ALLOW', verdict stays as the initial 'BLOCK'
    expect(result.guardrail).toBe('BLOCK')
  })
})
