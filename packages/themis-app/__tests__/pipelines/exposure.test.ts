// ─────────────────────────────────────────────
// Module mocks — hoisted before imports
// ─────────────────────────────────────────────
jest.mock('../../src/providers/llm', () => ({
  llm: jest.fn(),
  availableProviders: jest.fn(() => ['anthropic']),
}))
jest.mock('@aegis-skills/themis-core', () => ({
  ...jest.requireActual('@aegis-skills/themis-core'),
  redactSecrets: jest.fn((s: string) => s),
}))
import { llm } from '../../src/providers/llm'
import { plan } from '../../src/pipelines/exposure/planner'
import type { EvidenceInput, PolicyResult } from '@aegis-skills/themis-core'

const mockLlm = llm as jest.MockedFunction<typeof llm>

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
