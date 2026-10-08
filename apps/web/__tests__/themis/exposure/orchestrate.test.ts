// Integration test for the exposure orchestrator — real index.ts, mocked LLM.
// Proves the full lifecycle wires together and the deterministic/LLM boundary holds.

jest.mock('@/lib/themis/provider', () => ({
  llm: jest.fn(),
  availableProviders: jest.fn(() => ['anthropic']),
}))
jest.mock('@/lib/themis/secrets', () => ({
  redactSecrets: jest.fn((s: string) => s),
}))
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => null),
}))

import { llm } from '@/lib/themis/provider'
import { validateExposure } from '@/lib/themis/exposure/index'
import { ExposureRequest } from '@/lib/themis/exposure/types'

const mockLlm = llm as jest.MockedFunction<typeof llm>

function resp(content: string) {
  return { content, model: 't', provider: 'anthropic' as const, inputTokens: 1, outputTokens: 1, latencyMs: 1 }
}

// Route LLM calls by what each node asks for — the nodes send distinct JSON shapes.
function wireLlm() {
  mockLlm.mockImplementation(async (req) => {
    const u = req.userMessage
    if (u.includes('applicableSkills')) {
      return resp(JSON.stringify({ systemType: 'linux-server', affectedProduct: 'nginx', applicableSkills: ['network-security'] }))
    }
    if (u.includes('affectedVersionPresent')) {
      return resp(JSON.stringify({ exposure: 'VALIDATION_REQUIRED', confidence: 'high', reachable: true, affectedVersionPresent: true, rationale: 'affected version is internet-facing' }))
    }
    if (u.includes('earliestBreakableEdge')) {
      return resp(JSON.stringify({ impact: 'CROWN_JEWEL_REACHABLE', reachesCrownJewel: true, path: [{ from: 'web', to: 'db', relationship: 'REACHES', confidence: 'medium', evidenced: true }], earliestBreakableEdge: 'web->db', notes: 'one hop to the database' }))
    }
    if (u.includes('catalogue')) {
      return resp(JSON.stringify({ claim: 'establish exploitability', capabilityIds: ['REACHABILITY-CHECK-001', 'BANNER-VERSION-001'], rationale: {} }))
    }
    // report
    return resp('Executive summary: the asset is exposed and reachable.')
  })
}

beforeEach(() => { jest.clearAllMocks(); wireLlm() })

const baseReq = (over: Partial<ExposureRequest> = {}): ExposureRequest => ({
  input: 'nginx 1.20 internet-facing, CVE-2099-0001',
  cve: 'CVE-2099-0001',
  kevListed: true,
  authorization: { authorized: true, scopeConfirmed: true, targetIdentityVerified: true, maintenanceWindow: true, approver: 'lead' },
  context: { assetId: 'web-01', systemType: 'linux-server', businessCriticality: 'crown-jewel', environments: ['cloud'], crownJewel: true },
  ...over,
})

describe('validateExposure (integration)', () => {
  it('runs the full lifecycle for a KEV-listed crown-jewel exposure', async () => {
    const r = await validateExposure(baseReq())
    expect(r.case.states.exposure).toBe('VALIDATION_REQUIRED')
    // No exploitation evidence supplied → NOT_VALIDATED via NO_EXECUTION_LAYER.
    expect(r.case.states.exploitability).toBe('NOT_VALIDATED')
    expect(r.case.validationFailure).toBe('NO_EXECUTION_LAYER')
    expect(r.case.states.impact).toBe('CROWN_JEWEL_REACHABLE')
    expect(r.case.workflowState).toBe('VALIDATION_PENDING')
    // Risk computed, before only (no verification yet).
    expect(r.risk.before.score).toBeGreaterThan(0)
    expect(r.risk.after).toBeNull()
    expect(r.risk.proven).toBe(false)
    // Plan built from registry, within policy ceiling, not blocked.
    expect(r.plan.blocked).toBe(false)
    expect(r.plan.steps.length).toBeGreaterThan(0)
    expect(r.plan.steps.every((s) => s.capabilityId.length > 0)).toBe(true)
  })

  it('BLOCKS the plan when authorization is missing (deterministic gate)', async () => {
    const r = await validateExposure(baseReq({
      authorization: { authorized: false, scopeConfirmed: false, targetIdentityVerified: false },
    }))
    expect(r.policy.decision).toBe('DENY')
    expect(r.plan.blocked).toBe(true)
    expect(r.plan.steps).toHaveLength(0)
    expect(r.case.workflowState).toBe('BLOCKED')
  })

  it('confirms exploitability and proves a risk delta when evidence + retest are supplied', async () => {
    const r = await validateExposure(baseReq({
      providedEvidence: [
        { type: 'exploitation', summary: 'controlled marker executed', source: 'lab' },
        { type: 'exploitation', summary: 'reproduced with unique marker', source: 'lab' },
        { type: 'remediation', summary: 'patch applied to nginx', source: 'itsm' },
        { type: 'verification', summary: 'retest passed, no longer exploitable', source: 'lab' },
      ],
    }))
    expect(r.case.states.verification).toBe('VERIFIED_CLOSED')
    expect(r.case.workflowState).toBe('VERIFIED_CLOSED')
    expect(r.risk.after).not.toBeNull()
    expect(r.risk.proven).toBe(true)
    expect(r.risk.delta).toBeGreaterThan(0)
    expect(r.explain.whatProvesClosed).toMatch(/retest/i)
  })

  it('short-circuits impact when the vulnerability is not applicable', async () => {
    mockLlm.mockImplementation(async (req) => {
      const u = req.userMessage
      if (u.includes('applicableSkills')) return resp(JSON.stringify({ systemType: 'x', affectedProduct: 'y', applicableSkills: [] }))
      if (u.includes('affectedVersionPresent')) return resp(JSON.stringify({ exposure: 'NOT_APPLICABLE', confidence: 'high', reachable: false, affectedVersionPresent: false, rationale: 'unaffected build' }))
      return resp('summary')
    })
    const r = await validateExposure(baseReq({ kevListed: false }))
    expect(r.case.states.exposure).toBe('NOT_APPLICABLE')
    expect(r.risk.before.score).toBe(0)
    // Impact node should not have been consulted (no earliestBreakableEdge prompt).
    const impactCalls = mockLlm.mock.calls.filter((c) => c[0].userMessage.includes('earliestBreakableEdge'))
    expect(impactCalls).toHaveLength(0)
  })
})
