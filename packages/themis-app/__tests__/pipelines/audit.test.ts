import { NextRequest } from 'next/server'
import { ValidationError } from '@aegis-skills/themis-core'

// ─────────────────────────────────────────────
// Module mocks — must be hoisted before imports
// ─────────────────────────────────────────────

jest.mock('@/lib/themis/provider', () => ({
  llm: jest.fn(),
  availableProviders: jest.fn(() => ['anthropic']),
}))

jest.mock('@aegis-skills/themis-core', () => ({
  ...jest.requireActual('@aegis-skills/themis-core'),
  redactSecrets: jest.fn((s: string) => s),
}))

jest.mock('@/lib/themis/audit/index', () => ({
  audit: jest.fn(),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  })),
}))

// ─────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────

import { llm } from '@/lib/themis/provider'
import { redactSecrets, type AuditRequest, type Finding } from '@aegis-skills/themis-core'
import { ingest } from '@/lib/themis/audit/ingest'
import { assess } from '@/lib/themis/audit/assessor'
import { report } from '@/lib/themis/audit/reporter'
import { audit } from '@/lib/themis/audit/index'
import { POST } from '@/app/api/audit/route'

const mockLlm = llm as jest.MockedFunction<typeof llm>
const mockRedactSecrets = redactSecrets as jest.MockedFunction<typeof redactSecrets>
const mockAudit = audit as jest.MockedFunction<typeof audit>

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

const MOCK_AUDIT_REPORT = {
  executiveSummary: 'No critical findings.',
  standardsApplied: ['cis-l1' as const],
  findings: [],
  summary: { critical: 0, high: 0, medium: 0, low: 0, informational: 0, passed: 0 },
  skillTrace: [],
  durationMs: 100,
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

// ─────────────────────────────────────────────
// route tests
// ─────────────────────────────────────────────

function makeRouteRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/audit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAudit.mockResolvedValue(MOCK_AUDIT_REPORT)
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
  })

  test('input over 12000 chars returns 400', async () => {
    const req = makeRouteRequest({ input: 'a'.repeat(12001) })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Request invalid')
  })

  test('missing input field returns 400', async () => {
    const req = makeRouteRequest({ inputType: 'config' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('invalid inputType defaults to description gracefully (does not 400)', async () => {
    const req = makeRouteRequest({ input: 'some config', inputType: 'unknown-type' })
    const res = await POST(req)
    // Should not return 400 — inputType defaults to 'description'
    expect(res.status).not.toBe(400)
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ inputType: 'description' })
    )
  })

  test('security headers present on 200 response', async () => {
    const req = makeRouteRequest({ input: 'some config' })
    const res = await POST(req)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'none'")
  })

  test('security headers present on 400 response', async () => {
    const req = makeRouteRequest({ /* missing input */ })
    const res = await POST(req)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  test('invalid JSON body returns 400', async () => {
    const req = new NextRequest('http://localhost/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json {{{',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('unknown standards are filtered silently', async () => {
    const req = makeRouteRequest({ input: 'some config', standards: ['cis-l1', 'fake-standard'] })
    const res = await POST(req)
    expect(res.status).not.toBe(400)
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ standards: ['cis-l1'] })
    )
  })

  test('non-array standards defaults to []', async () => {
    const req = makeRouteRequest({ input: 'some config', standards: 'cis-l1' })
    const res = await POST(req)
    expect(res.status).not.toBe(400)
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ standards: [] })
    )
  })

  test('invalid systemType slug is dropped silently', async () => {
    const req = makeRouteRequest({ input: 'config', context: { systemType: 'INVALID SLUG!!', environments: [] } })
    const res = await POST(req)
    expect(res.status).not.toBe(400)
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ systemType: undefined }),
      })
    )
  })

  test('successful request returns 200 with audit report shape', async () => {
    const req = makeRouteRequest({ input: 'some config', standards: ['cis-l1'] })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('executiveSummary')
    expect(body).toHaveProperty('findings')
    expect(body).toHaveProperty('summary')
    expect(body).toHaveProperty('standardsApplied')
  })
})
