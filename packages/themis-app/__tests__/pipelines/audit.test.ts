import { ValidationError } from '@aegis-skills/themis-core'

// ─────────────────────────────────────────────
// Module mocks — must be hoisted before imports
// ─────────────────────────────────────────────

jest.mock('../../src/providers/llm', () => ({
  llm: jest.fn(),
  availableProviders: jest.fn(() => ['anthropic']),
}))

jest.mock('@aegis-skills/themis-core', () => ({
  ...jest.requireActual('@aegis-skills/themis-core'),
  redactSecrets: jest.fn((s: string) => s),
}))

// ─────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────

import { llm } from '../../src/providers/llm'
import { redactSecrets, type AuditRequest, type Finding } from '@aegis-skills/themis-core'
import { ingest } from '../../src/pipelines/audit/ingest'
import { assess } from '../../src/pipelines/audit/assessor'
import { report } from '../../src/pipelines/audit/reporter'

const mockLlm = llm as jest.MockedFunction<typeof llm>
const mockRedactSecrets = redactSecrets as jest.MockedFunction<typeof redactSecrets>

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeLLMResponse(content: string) {
  return {
    content,
    model: 'test-model',
    provider: 'anthropic' as const,
    inputTokens: 10,
    outputTokens: 20,
    latencyMs: 100,
  }
}

function makeAuditRequest(overrides: Partial<AuditRequest> = {}): AuditRequest {
  return {
    input: 'Check SSH configuration for CIS compliance',
    inputType: 'config',
    standards: [],
    context: { environments: [] },
    ...overrides,
  }
}

// ─────────────────────────────────────────────
// ingest tests
// ─────────────────────────────────────────────

describe('ingest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: redactSecrets returns input unchanged
    mockRedactSecrets.mockImplementation((s: string) => s)
    // Default: LLM returns valid JSON classification
    mockLlm.mockResolvedValue(
      makeLLMResponse(JSON.stringify({ systemType: 'linux-server', applicableSkills: ['ssh-hardening'] }))
    )
  })

  test('secrets in input are redacted before LLM call', async () => {
    const input = 'SSH config with AKIAIOSFODNN7EXAMPLE key'
    mockRedactSecrets.mockImplementation((s: string) => s.replace('AKIAIOSFODNN7EXAMPLE', '[REDACTED]'))
    const req = makeAuditRequest({ input })
    await ingest(req)
    expect(mockRedactSecrets).toHaveBeenCalledWith(input)
  })

  test('warning string prepended when redaction occurs', async () => {
    const originalInput = 'config with secret'
    const redactedOutput = 'config with [REDACTED]'
    // Return a different string to simulate redaction
    mockRedactSecrets.mockReturnValueOnce(redactedOutput)

    const req = makeAuditRequest({ input: originalInput })
    const result = await ingest(req)

    expect(result.sanitisedInput).toContain('[WARNING: Sensitive data was detected and redacted from the input]')
    expect(result.sanitisedInput).toContain(redactedOutput)
  })

  test('no warning prepended when no redaction occurs', async () => {
    const input = 'clean config without secrets'
    mockRedactSecrets.mockReturnValueOnce(input) // same string = no redaction
    mockLlm.mockResolvedValue(makeLLMResponse(JSON.stringify({ systemType: 'generic', applicableSkills: [] })))

    const req = makeAuditRequest({ input })
    const result = await ingest(req)

    expect(result.sanitisedInput).not.toContain('[WARNING:')
  })

  test('input exceeding 12000 chars throws ValidationError', async () => {
    const input = 'a'.repeat(12001)
    mockRedactSecrets.mockReturnValueOnce(input)
    const req = makeAuditRequest({ input })

    await expect(ingest(req)).rejects.toThrow(ValidationError)
  })

  test('LLM failure falls back to defaults', async () => {
    mockLlm.mockRejectedValue(new Error('provider down'))
    const req = makeAuditRequest({ input: 'some config', context: { systemType: 'fallback-system', environments: [] } })
    const result = await ingest(req)

    expect(result.detectedSystemType).toBe('fallback-system')
    expect(result.applicableSkills).toEqual([])
  })

  test('LLM JSON parse failure falls back to defaults', async () => {
    mockLlm.mockResolvedValue(makeLLMResponse('not valid json {{{'))
    const req = makeAuditRequest({ context: { systemType: 'my-system', environments: [] } })
    const result = await ingest(req)

    expect(result.detectedSystemType).toBe('my-system')
    expect(result.applicableSkills).toEqual([])
  })
})

// ─────────────────────────────────────────────
// standards tests (pure unit, no mocks needed)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// assessor tests
// ─────────────────────────────────────────────

describe('assess', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRedactSecrets.mockImplementation((s: string) => s)
  })

  test('failed standard (llm throws) returns empty findings array without throwing', async () => {
    mockLlm.mockRejectedValue(new Error('LLM unavailable'))
    const result = await assess('some config', ['cis-l1'], [], { environments: [] })
    expect(result).toEqual([])
  })

  test('evidence fields have redactSecrets applied', async () => {
    const awsKey = 'AKIAIOSFODNN7EXAMPLE'
    const findingWithSecret: Finding = {
      controlId: 'CIS-1.1',
      standard: 'cis-l1',
      severity: 'high',
      title: 'Exposed key found',
      evidence: `Found key: ${awsKey}`,
      recommendation: `Remove key: ${awsKey}`,
      reference: 'https://cisecurity.org',
    }

    mockLlm.mockResolvedValue(makeLLMResponse(JSON.stringify([findingWithSecret])))
    mockRedactSecrets.mockImplementation((s: string) => s.replace(awsKey, '[REDACTED]'))

    const result = await assess('some config', ['cis-l1'], [], { environments: [] })

    expect(result[0].evidence).not.toContain(awsKey)
    expect(result[0].evidence).toContain('[REDACTED]')
    expect(result[0].recommendation).not.toContain(awsKey)
    expect(result[0].recommendation).toContain('[REDACTED]')
  })

  test('JSON parse failure returns empty array not exception', async () => {
    mockLlm.mockResolvedValue(makeLLMResponse('not valid json at all'))
    const result = await assess('some config', ['cis-l1'], [], { environments: [] })
    expect(result).toEqual([])
  })

  test('multiple standards run concurrently and results are combined', async () => {
    const findingA: Finding = {
      controlId: 'CIS-1.1',
      standard: 'cis-l1',
      severity: 'high',
      title: 'Finding A',
      evidence: 'evidence A',
      recommendation: 'rec A',
      reference: 'ref A',
    }
    const findingB: Finding = {
      controlId: 'NIST-ID.AM-1',
      standard: 'nist-csf',
      severity: 'medium',
      title: 'Finding B',
      evidence: 'evidence B',
      recommendation: 'rec B',
      reference: 'ref B',
    }

    mockLlm
      .mockResolvedValueOnce(makeLLMResponse(JSON.stringify([findingA])))
      .mockResolvedValueOnce(makeLLMResponse(JSON.stringify([findingB])))

    const result = await assess('some config', ['cis-l1', 'nist-csf'], [], { environments: [] })
    expect(result.length).toBe(2)
  })
})

// ─────────────────────────────────────────────
// scorer tests (pure unit)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// reporter tests
// ─────────────────────────────────────────────

describe('report', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRedactSecrets.mockImplementation((s: string) => s)
  })

  test('findings are wrapped in <audit_findings> tags in the LLM call', async () => {
    mockLlm.mockResolvedValue(makeLLMResponse('Summary of findings.'))
    const findings: Finding[] = [
      { controlId: 'CIS-1.1', standard: 'cis-l1', severity: 'high', title: 'Test', evidence: 'e', recommendation: 'r', reference: 'ref' },
    ]
    const req = makeAuditRequest()

    await report(req, findings, ['cis-l1'], [])

    expect(mockLlm).toHaveBeenCalledTimes(1)
    const callArg = mockLlm.mock.calls[0][0]
    expect(callArg.userMessage).toContain('<audit_findings>')
    expect(callArg.userMessage).toContain('</audit_findings>')
  })

  test('returned summary has redactSecrets applied', async () => {
    const awsKey = 'AKIAIOSFODNN7EXAMPLE'
    mockLlm.mockResolvedValue(makeLLMResponse(`Summary contains secret: ${awsKey}`))
    mockRedactSecrets.mockImplementation((s: string) => s.replace(awsKey, '[REDACTED]'))

    const req = makeAuditRequest()
    const result = await report(req, [], ['cis-l1'], [])

    expect(result).not.toContain(awsKey)
    expect(result).toContain('[REDACTED]')
  })

  test('LLM failure returns fallback message without throwing', async () => {
    mockLlm.mockRejectedValue(new Error('provider down'))
    const req = makeAuditRequest()

    const result = await report(req, [], ['cis-l1'], [])
    expect(result).toBe('Executive summary unavailable.')
  })
})
