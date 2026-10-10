import { NextRequest } from 'next/server'

// ─────────────────────────────────────────────
// Module mocks — hoisted before imports
// ─────────────────────────────────────────────
jest.mock('@/lib/themis/provider', () => ({
  llm: jest.fn(),
  availableProviders: jest.fn(() => ['anthropic']),
}))
jest.mock('@aegis-skills/themis-core', () => ({
  ...jest.requireActual('@aegis-skills/themis-core'),
  redactSecrets: jest.fn((s: string) => s),
}))
jest.mock('@/lib/themis/exposure/index', () => ({
  validateExposure: jest.fn(),
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
      update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
    }),
  })),
}))

import { llm } from '@/lib/themis/provider'
import { plan } from '@/lib/themis/exposure/planner'
import { validateExposure } from '@/lib/themis/exposure/index'
import { POST } from '@/app/api/exposure/route'
import type { EvidenceInput, PolicyResult } from '@aegis-skills/themis-core'

const mockLlm = llm as jest.MockedFunction<typeof llm>
const mockValidate = validateExposure as jest.MockedFunction<typeof validateExposure>

function makeLLMResponse(content: string) {
  return {
    content,
    model: 'test',
    provider: 'anthropic' as const,
    inputTokens: 1,
    outputTokens: 1,
    latencyMs: 1,
  }
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/exposure', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => jest.clearAllMocks())

// ─────────────────────────────────────────────
// Planner (selects from registry only, respects policy)
// ─────────────────────────────────────────────
describe('planner.plan', () => {
  it('returns a blocked plan when policy DENIES', async () => {
    const policy: PolicyResult = { decision: 'DENY', reasons: ['no auth'], highestDepthPermitted: 'PASSIVE' }
    const p = await plan('prove RCE', 'input', policy)
    expect(p.blocked).toBe(true)
    expect(p.steps).toHaveLength(0)
    expect(mockLlm).not.toHaveBeenCalled()
  })

  it('discards capability ids not in the registry', async () => {
    mockLlm.mockResolvedValue(
      makeLLMResponse(JSON.stringify({
        claim: 'prove reachability',
        capabilityIds: ['REACHABILITY-CHECK-001', 'MADE-UP-999'],
        rationale: { 'REACHABILITY-CHECK-001': 'confirms reachable' },
      })),
    )
    const policy: PolicyResult = { decision: 'ALLOW', reasons: [], highestDepthPermitted: 'LOW_IMPACT' }
    const p = await plan('prove reachability', 'input', policy)
    const ids = p.steps.map((s) => s.capabilityId)
    expect(ids).toContain('REACHABILITY-CHECK-001')
    expect(ids).not.toContain('MADE-UP-999')
  })

  it('falls back to passive capabilities on LLM failure', async () => {
    mockLlm.mockRejectedValue(new Error('provider down'))
    const policy: PolicyResult = { decision: 'ALLOW', reasons: [], highestDepthPermitted: 'LOW_IMPACT' }
    const p = await plan('prove something', 'input', policy)
    expect(p.steps.length).toBeGreaterThan(0)
    expect(p.depth).toBe('PASSIVE')
  })
})

// ─────────────────────────────────────────────
// API route (validation, security headers, safe errors)
// ─────────────────────────────────────────────
describe('POST /api/exposure', () => {
  it('rejects a non-string input with 400', async () => {
    const res = await POST(makeRequest({ input: 123 }))
    expect(res.status).toBe(400)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('rejects malformed JSON with 400', async () => {
    const bad = new NextRequest('http://localhost/api/exposure', {
      method: 'POST', body: '{not json', headers: { 'content-type': 'application/json' },
    })
    const res = await POST(bad)
    expect(res.status).toBe(400)
  })

  it('passes a valid request to the workflow and returns 200 with headers', async () => {
    mockValidate.mockResolvedValue({
      case: {
        caseId: 'exp-abc', workflowState: 'VALIDATION_PENDING',
        states: {
          exposure: 'POTENTIAL_EXPOSURE', exploitability: 'NOT_VALIDATED', impact: 'UNKNOWN',
          detection: 'NOT_TESTED', remediation: 'NONE', verification: 'NOT_VERIFIED',
        },
        exploitabilityConfidence: 'unknown',
      },
      plan: { claim: 'c', steps: [], depth: 'PASSIVE', requiresApproval: false, approvalRequirements: [], blocked: false },
      impact: { state: 'UNKNOWN', path: [], reachesCrownJewel: false, notes: '' },
      risk: {
        before: { score: 10, band: 'low', factors: {} as never, confidence: 'low', rationale: [] },
        after: null, delta: null, proven: false,
      },
      policy: { decision: 'ALLOW', reasons: [], highestDepthPermitted: 'LOW_IMPACT' },
      evidence: [],
      executiveSummary: 'summary',
      explain: {
        whyExposed: '', whyItMatters: '', whatProvesExploitability: '', assetAffected: '',
        controlOutcome: '', remediation: '', whatProvesClosed: '',
      },
      skillTrace: ['exposure-validation'],
      durationMs: 1,
    })

    const res = await POST(makeRequest({
      input: 'nginx 1.20 on an internet-facing host, CVE referenced',
      cve: 'CVE-2099-12345',
      authorization: { authorized: true, scopeConfirmed: true, targetIdentityVerified: true },
      context: { environments: ['cloud'], businessCriticality: 'high' },
    }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'none'")
    expect(mockValidate).toHaveBeenCalledTimes(1)
    // CVE normalised, authorization passed through.
    const arg = mockValidate.mock.calls[0][0]
    expect(arg.cve).toBe('CVE-2099-12345')
    expect(arg.authorization.authorized).toBe(true)
  })

  it('defaults missing authorization fields to unauthorized (safe)', async () => {
    mockValidate.mockResolvedValue({} as never)
    await POST(makeRequest({ input: 'something', context: { environments: [] } }))
    const arg = mockValidate.mock.calls[0][0]
    expect(arg.authorization.authorized).toBe(false)
    expect(arg.authorization.scopeConfirmed).toBe(false)
  })

  it('drops an invalid CVE and invalid evidence types', async () => {
    mockValidate.mockResolvedValue({} as never)
    await POST(makeRequest({
      input: 'x',
      cve: 'not-a-cve',
      providedEvidence: [
        { type: 'exploitation', summary: 'marker executed', source: 'lab' },
        { type: 'bogus', summary: 'x', source: 'y' },
      ],
      authorization: { authorized: true, scopeConfirmed: true, targetIdentityVerified: true },
      context: { environments: [] },
    }))
    const arg = mockValidate.mock.calls[0][0]
    expect(arg.cve).toBeUndefined()
    expect(arg.providedEvidence).toHaveLength(1)
    expect(arg.providedEvidence![0].type).toBe('exploitation')
  })
})
