// Mock the provider module
jest.mock('@/lib/themis/provider', () => ({
  llm: jest.fn(),
}))

import { synthesise } from '@/lib/themis/synthesise'
import { llm } from '@/lib/themis/provider'
import { SubTaskResult } from '@/lib/themis/types'

const mockLlm = llm as jest.MockedFunction<typeof llm>

function makeResult(overrides: Partial<SubTaskResult> = {}): SubTaskResult {
  return {
    subTaskId: 'st-1',
    skill: 'auth-bypass',
    findings: 'Authentication uses weak tokens that can be brute forced.',
    confidence: 'high',
    guardrail: 'PASS',
    inputTokens: 10,
    outputTokens: 20,
    ...overrides,
  }
}

function makeLlmResponse(content: string) {
  return Promise.resolve({
    content,
    model: 'claude-sonnet-4-6',
    provider: 'anthropic' as const,
    inputTokens: 50,
    outputTokens: 200,
    latencyMs: 500,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockLlm.mockImplementation(() =>
    makeLlmResponse('# Security Report\n\n## Executive Summary\n\nFindings reviewed.')
  )
})

describe('synthesise', () => {
  test('blocked results are absent from the LLM call user message', async () => {
    const passResult = makeResult({
      subTaskId: 'st-1',
      skill: 'auth-bypass',
      findings: 'PASS_FINDING: Auth uses weak tokens',
      guardrail: 'PASS',
    })
    const blockResult = makeResult({
      subTaskId: 'st-2',
      skill: 'sql-injection',
      findings: 'BLOCK_SECRET_FINDING: Contains sensitive data AKIAIOSFODNN7EXAMPLE',
      guardrail: 'BLOCK',
    })

    // synthesise receives only non-blocked results (caller filters)
    // Pass only the PASS result as the spec says caller filters BLOCK
    await synthesise('Analyse the system', [passResult])

    const llmCall = mockLlm.mock.calls[0][0]
    expect(llmCall.userMessage).toContain('PASS_FINDING')
    expect(llmCall.userMessage).not.toContain('BLOCK_SECRET_FINDING')
    expect(llmCall.userMessage).not.toContain('AKIAIOSFODNN7EXAMPLE')
  })

  test('PASS findings appear in the LLM call user message', async () => {
    const result = makeResult({
      findings: 'The login endpoint is vulnerable to timing attacks.',
      guardrail: 'PASS',
    })

    await synthesise('Analyse login', [result])

    const llmCall = mockLlm.mock.calls[0][0]
    expect(llmCall.userMessage).toContain('The login endpoint is vulnerable to timing attacks.')
  })

  test('calls redactSecrets on returned content', async () => {
    const secretInReport = 'AKIAIOSFODNN7EXAMPLE'
    mockLlm.mockImplementation(() =>
      makeLlmResponse(`Security report with key ${secretInReport} found`)
    )

    const result = await synthesise('Analyse', [makeResult()])

    expect(result).not.toContain(secretInReport)
    expect(result).toContain('[REDACTED]')
  })

  test('returns the synthesised content from LLM', async () => {
    const expectedContent = '# Security Report\n\nExecutive Summary: All good.'
    mockLlm.mockImplementation(() => makeLlmResponse(expectedContent))

    const result = await synthesise('Analyse', [makeResult()])
    expect(result).toBe(expectedContent)
  })

  test('includes FLAG note in user message when guardrailReason is set', async () => {
    const result = makeResult({
      findings: 'Ambiguous exploit instructions found.',
      guardrail: 'FLAG',
      guardrailReason: 'Contains overly detailed exploit details',
    })

    await synthesise('Analyse', [result])

    const llmCall = mockLlm.mock.calls[0][0]
    expect(llmCall.userMessage).toContain('FLAGGED')
    expect(llmCall.userMessage).toContain('Contains overly detailed exploit details')
  })

  test('handles empty results array', async () => {
    await synthesise('Analyse', [])

    expect(mockLlm).toHaveBeenCalledTimes(1)
    const llmCall = mockLlm.mock.calls[0][0]
    // userMessage will be empty string (no findings blocks)
    expect(llmCall.userMessage).toBe('')
  })

  test('wraps each finding in agent_finding XML tags', async () => {
    const result = makeResult({ skill: 'xss-detection' })
    await synthesise('Analyse', [result])

    const llmCall = mockLlm.mock.calls[0][0]
    expect(llmCall.userMessage).toContain('<agent_finding skill="xss-detection">')
    expect(llmCall.userMessage).toContain('</agent_finding>')
  })

  test('uses standard tier for synthesis LLM call', async () => {
    await synthesise('Analyse', [makeResult()])

    const llmCall = mockLlm.mock.calls[0][0]
    expect(llmCall.tier).toBe('standard')
  })

  test('clean report with no secrets passes through unchanged', async () => {
    const cleanReport = 'SQL injection found in login endpoint. Parameterize your queries.'
    mockLlm.mockImplementation(() => makeLlmResponse(cleanReport))

    const result = await synthesise('Analyse', [makeResult()])
    expect(result).toBe(cleanReport)
  })
})
