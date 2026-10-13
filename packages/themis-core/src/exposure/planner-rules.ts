import type { Capability, PolicyResult, TestDepth, ValidationPlan, ValidationStep } from './types'
import { getCapability } from './capabilities'
import { redactSecrets } from '../secrets'

const DEPTH_ORDER: TestDepth[] = ['PASSIVE', 'LOW_IMPACT', 'CONTROLLED_EXECUTION', 'IMPACT_VALIDATION']

export function deniedPlan(claim: string, policy: PolicyResult): ValidationPlan {
  return {
    claim, steps: [], depth: 'PASSIVE', requiresApproval: false, blocked: true,
    blockReason: `Policy denied: ${policy.reasons.join(' ')}`, approvalRequirements: [],
  }
}

export function plannerCatalogue(allowed: Capability[]) {
  return allowed.map((c) => ({ id: c.id, claim: c.category, depth: c.depth, description: c.description }))
}

/** Only ids inside `allowed` survive. Throws on invalid JSON (caller uses passiveFallbackSteps). */
export function parsePlannerResponse(
  content: string, claim: string, allowed: Capability[], redact: (s: string) => string = redactSecrets,
): { claim: string; steps: ValidationStep[] } {
  const allowedIds = new Set(allowed.map((c) => c.id))
  const parsed = JSON.parse(content) as { claim?: unknown; capabilityIds?: unknown; rationale?: unknown }
  let claimOut = claim
  if (typeof parsed.claim === 'string' && parsed.claim.trim()) claimOut = parsed.claim
  let selectedIds: string[] = []
  if (Array.isArray(parsed.capabilityIds)) {
    selectedIds = (parsed.capabilityIds as unknown[]).filter((id): id is string => typeof id === 'string' && allowedIds.has(id))
  }
  const rationaleMap = typeof parsed.rationale === 'object' && parsed.rationale !== null
    ? (parsed.rationale as Record<string, unknown>)
    : {}
  const steps: ValidationStep[] = selectedIds.map((id) => {
    const cap = getCapability(id)!
    const r = rationaleMap[id]
    return { capabilityId: id, rationale: redact(typeof r === 'string' ? r : cap.description), expectedEvidence: cap.expectedEvidence }
  })
  return { claim: claimOut, steps }
}

/** The safest passive capabilities available within the ceiling. */
export function passiveFallbackSteps(allowed: Capability[]): ValidationStep[] {
  return allowed.filter((c) => c.depth === 'PASSIVE').map((c) => ({
    capabilityId: c.id, rationale: c.description, expectedEvidence: c.expectedEvidence,
  }))
}

export function finalisePlan(claim: string, steps: ValidationStep[], policy: PolicyResult): ValidationPlan {
  const depth = steps.reduce<TestDepth>((max, s) => {
    const cap = getCapability(s.capabilityId)
    if (!cap) return max
    return DEPTH_ORDER.indexOf(cap.depth) > DEPTH_ORDER.indexOf(max) ? cap.depth : max
  }, 'PASSIVE')

  const gated = policy.decision !== 'ALLOW'

  return {
    claim,
    steps,
    depth,
    requiresApproval: policy.decision === 'REQUIRE_APPROVAL',
    approvalRequirements: gated ? policy.reasons : [],
    blocked: gated,
    blockReason: gated ? policy.reasons.join(' ') : undefined,
  }
}
