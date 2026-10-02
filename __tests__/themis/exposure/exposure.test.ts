import { NextRequest } from 'next/server'

// ─────────────────────────────────────────────
// Module mocks — hoisted before imports
// ─────────────────────────────────────────────
jest.mock('@/lib/themis/provider', () => ({
  llm: jest.fn(),
  availableProviders: jest.fn(() => ['anthropic']),
}))
jest.mock('@/lib/themis/secrets', () => ({
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
import { authorize } from '@/lib/themis/exposure/policy'
import { evaluateRisk, threatLikelihoodFrom } from '@/lib/themis/exposure/risk'
import { plan } from '@/lib/themis/exposure/planner'
import { assessDetection } from '@/lib/themis/exposure/detection'
import { verify } from '@/lib/themis/exposure/verify'
import { capabilitiesWithinDepth, CAPABILITY_REGISTRY } from '@/lib/themis/exposure/capabilities'
import { validateExposure } from '@/lib/themis/exposure/index'
import { POST } from '@/app/api/exposure/route'
import {
  AuthorizationContext,
  EvidenceInput,
  PolicyResult,
  RiskContext,
} from '@/lib/themis/exposure/types'

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

const fullAuth: AuthorizationContext = {
  authorized: true,
  scopeConfirmed: true,
  targetIdentityVerified: true,
  maintenanceWindow: true,
  approver: 'secops-lead',
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
// Policy engine (deterministic)
// ─────────────────────────────────────────────
describe('policy.authorize', () => {
  it('DENIES when not authorized', () => {
    const r = authorize({ authorized: false, scopeConfirmed: true, targetIdentityVerified: true }, 'PASSIVE', 'low')
    expect(r.decision).toBe('DENY')
    expect(r.highestDepthPermitted).toBe('PASSIVE')
  })

  it('DENIES when scope not confirmed', () => {
    const r = authorize({ authorized: true, scopeConfirmed: false, targetIdentityVerified: true }, 'PASSIVE', 'low')
    expect(r.decision).toBe('DENY')
  })

  it('DENIES when authorization expired', () => {
    const r = authorize(
      { authorized: true, scopeConfirmed: true, targetIdentityVerified: true, expiresAt: '2000-01-01T00:00:00Z' },
      'PASSIVE', 'low',
    )
    expect(r.decision).toBe('DENY')
    expect(r.reasons.join(' ')).toMatch(/expired/i)
  })

  it('REQUIRES target confirmation for non-passive when identity unverified', () => {
    const r = authorize(
      { authorized: true, scopeConfirmed: true, targetIdentityVerified: false, maintenanceWindow: true, approver: 'x' },
      'CONTROLLED_EXECUTION', 'low',
    )
    expect(r.decision).toBe('REQUIRE_TARGET_CONFIRMATION')
    expect(r.highestDepthPermitted).toBe('PASSIVE')
  })

  it('REQUIRES approval for controlled execution on a crown jewel without approver', () => {
    const r = authorize(
      { authorized: true, scopeConfirmed: true, targetIdentityVerified: true, maintenanceWindow: true },
      'CONTROLLED_EXECUTION', 'crown-jewel',
    )
    expect(r.decision).toBe('REQUIRE_APPROVAL')
  })

  it('REQUIRES change window for controlled execution without one', () => {
    const r = authorize(
      { authorized: true, scopeConfirmed: true, targetIdentityVerified: true, approver: 'x' },
      'CONTROLLED_EXECUTION', 'low',
    )
    expect(r.decision).toBe('REQUIRE_CHANGE_WINDOW')
  })

  it('ALLOWS low-impact on a low-criticality asset with full auth', () => {
    const r = authorize(fullAuth, 'LOW_IMPACT', 'low')
    expect(r.decision).toBe('ALLOW')
  })
})

// ─────────────────────────────────────────────
// Risk engine (deterministic)
// ─────────────────────────────────────────────
describe('risk.evaluateRisk', () => {
  const base: RiskContext = {
    threatLikelihood: 1,
    exposure: 'VALIDATION_REQUIRED',
    exploitability: 'CONFIRMED',
    exploitabilityConfidence: 'high',
    criticality: 'crown-jewel',
    impact: 'CROWN_JEWEL_REACHABLE',
    detection: 'MISSED',
  }

  it('scores a confirmed crown-jewel exposure high', () => {
    const r = evaluateRisk(base)
    expect(r.score).toBeGreaterThan(60)
    expect(r.band).toBe('critical')
    expect(r.confidence).toBe('high')
  })

  it('collapses the score when the vulnerability is not applicable', () => {
    const r = evaluateRisk({ ...base, exposure: 'NOT_APPLICABLE' })
    expect(r.score).toBe(0)
  })

  it('collapses the score when proven not exploitable', () => {
    const r = evaluateRisk({ ...base, exploitability: 'NOT_EXPLOITABLE' })
    expect(r.score).toBeLessThan(10)
  })

  it('caps confidence to unknown when exploitability confidence is unknown', () => {
    const r = evaluateRisk({ ...base, exploitabilityConfidence: 'unknown' })
    expect(r.confidence).toBe('unknown')
    expect(r.band).toBe('unknown')
  })

  it('KEV dominates threat likelihood', () => {
    expect(threatLikelihoodFrom(true, 0.01)).toBe(1.0)
    expect(threatLikelihoodFrom(false, 0.4)).toBe(0.4)
    expect(threatLikelihoodFrom(false, undefined)).toBe(0.3)
  })
})

// ─────────────────────────────────────────────
// Capability registry
// ─────────────────────────────────────────────
describe('capabilities', () => {
  it('passive ceiling yields only passive capabilities', () => {
    const caps = capabilitiesWithinDepth('PASSIVE')
    expect(caps.every((c) => c.depth === 'PASSIVE')).toBe(true)
    expect(caps.length).toBeGreaterThan(0)
  })

  it('every capability prohibits dangerous follow-on actions at controlled depth', () => {
    const controlled = CAPABILITY_REGISTRY.filter((c) => c.depth === 'CONTROLLED_EXECUTION')
    for (const c of controlled) {
      expect(c.prohibited).toEqual(expect.arrayContaining(['persistence']))
    }
  })
})

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
// Detection (deterministic from evidence)
// ─────────────────────────────────────────────
describe('detection.assessDetection', () => {
  it('returns NOT_TESTED with no telemetry evidence', () => {
    expect(assessDetection([]).state).toBe('NOT_TESTED')
  })
  it('returns PREVENTED when evidence says blocked', () => {
    const ev: EvidenceInput[] = [{ type: 'edr', summary: 'technique blocked by agent', source: 'edr' }]
    expect(assessDetection(ev).state).toBe('PREVENTED')
  })
  it('returns LOGGED_ONLY when telemetry present but no alert', () => {
    const ev: EvidenceInput[] = [{ type: 'siem', summary: 'event logged to siem', source: 'siem' }]
    expect(assessDetection(ev).state).toBe('LOGGED_ONLY')
  })
  it('returns MISSED when evidence says undetected', () => {
    const ev: EvidenceInput[] = [{ type: 'telemetry', summary: 'no alert, undetected', source: 't' }]
    expect(assessDetection(ev).state).toBe('MISSED')
  })
})

// ─────────────────────────────────────────────
// Verify (deterministic; closure needs retest)
// ─────────────────────────────────────────────
describe('verify', () => {
  it('does not close on remediation evidence alone', () => {
    const ev: EvidenceInput[] = [{ type: 'remediation', summary: 'patch applied', source: 'itsm' }]
    const r = verify(ev, 'CONFIRMED')
    expect(r.remediation).toBe('APPLIED')
    expect(r.verification).toBe('NOT_VERIFIED')
  })
  it('closes when retest shows the proof no longer succeeds', () => {
    const ev: EvidenceInput[] = [
      { type: 'remediation', summary: 'patch applied', source: 'itsm' },
      { type: 'verification', summary: 'retest passed, no longer exploitable', source: 'lab' },
    ]
    const r = verify(ev, 'CONFIRMED')
    expect(r.verification).toBe('VERIFIED_CLOSED')
    expect(r.exploitabilityAfter).toBe('NOT_EXPLOITABLE')
  })
  it('reopens when retest still succeeds', () => {
    const ev: EvidenceInput[] = [{ type: 'verification', summary: 'still exploitable after patch', source: 'lab' }]
    const r = verify(ev, 'CONFIRMED')
    expect(r.verification).toBe('FAILED')
  })
  it('is PARTIAL/CONTROLLED when only a compensating control is verified', () => {
    const ev: EvidenceInput[] = [
      { type: 'remediation', summary: 'compensating control: waf rule added', source: 'waf' },
      { type: 'verification', summary: 'retest passed via the waf rule', source: 'lab' },
    ]
    const r = verify(ev, 'CONFIRMED')
    expect(r.verification).toBe('PARTIAL')
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
