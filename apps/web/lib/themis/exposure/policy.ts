// Deterministic policy engine — the authorization boundary.
//
// The LLM is NEVER the authority here. This is a pure function of the
// authorization context, the test depth and the business criticality. It decides
// what the workflow is permitted to plan, and whether that plan needs approval or
// a change window. No network, no model, no side effects.

import {
  AuthorizationContext,
  BusinessCriticality,
  PolicyDecision,
  PolicyResult,
  TestDepth,
} from './types'

const DEPTH_ORDER: TestDepth[] = ['PASSIVE', 'LOW_IMPACT', 'CONTROLLED_EXECUTION', 'IMPACT_VALIDATION']

function depthRank(d: TestDepth): number {
  return DEPTH_ORDER.indexOf(d)
}

function isExpired(expiresAt: string | undefined, now: number): boolean {
  if (!expiresAt) return false
  const t = Date.parse(expiresAt)
  if (Number.isNaN(t)) return false
  return t < now
}

/**
 * Authorize a validation of a given maximum depth against a target.
 *
 * Returns the decision, the deterministic reasons, and the highest depth the
 * policy will permit for this target — which the planner must not exceed.
 */
export function authorize(
  auth: AuthorizationContext,
  requestedDepth: TestDepth,
  criticality: BusinessCriticality,
  now: number = Date.now(),
): PolicyResult {
  const reasons: string[] = []

  // Hard denials — any one of these blocks all live-target activity.
  if (!auth.authorized) {
    reasons.push('No written authorization for this target/test — DO NOT EXECUTE.')
    return { decision: 'DENY', reasons, highestDepthPermitted: 'PASSIVE' }
  }
  if (!auth.scopeConfirmed) {
    reasons.push('Scope not confirmed for this target — ambiguity resolves to DENY.')
    return { decision: 'DENY', reasons, highestDepthPermitted: 'PASSIVE' }
  }
  if (isExpired(auth.expiresAt, now)) {
    reasons.push('Authorization window has expired — case is EXPIRED.')
    return { decision: 'DENY', reasons, highestDepthPermitted: 'PASSIVE' }
  }

  // Target identity must be verified before anything beyond passive planning.
  if (!auth.targetIdentityVerified) {
    reasons.push('Target identity not verified — re-verify immediately before execution.')
    // Passive planning is permitted; anything higher requires confirmation first.
    if (depthRank(requestedDepth) > depthRank('PASSIVE')) {
      return { decision: 'REQUIRE_TARGET_CONFIRMATION', reasons, highestDepthPermitted: 'PASSIVE' }
    }
  }

  // Determine the ceiling this target allows, then compare to the request.
  // Crown jewels and high criticality default one rung stricter on approval.
  const needsApprovalFromDepth: TestDepth =
    criticality === 'crown-jewel' || criticality === 'high'
      ? 'LOW_IMPACT'
      : 'CONTROLLED_EXECUTION'

  // CONTROLLED_EXECUTION and above require a change window for production-class work.
  const needsWindowFromDepth: TestDepth = 'CONTROLLED_EXECUTION'

  let decision: PolicyDecision = 'ALLOW'

  if (depthRank(requestedDepth) >= depthRank(needsWindowFromDepth) && !auth.maintenanceWindow) {
    reasons.push(`Depth ${requestedDepth} requires an approved change window.`)
    decision = 'REQUIRE_CHANGE_WINDOW'
  }

  if (depthRank(requestedDepth) >= depthRank(needsApprovalFromDepth) && !auth.approver) {
    reasons.push(
      `Depth ${requestedDepth} on ${criticality} asset requires a named approver.`,
    )
    // Approval requirement outranks change-window: both may apply, report approval.
    decision = 'REQUIRE_APPROVAL'
  }

  if (decision === 'ALLOW') {
    reasons.push(`Authorized: depth ${requestedDepth} permitted for ${criticality} asset.`)
  }

  // The highest depth permitted outright (no further gate) for this target.
  const highestDepthPermitted: TestDepth = computeCeiling(auth, criticality)

  return { decision, reasons, highestDepthPermitted }
}

// The deepest tier that would be ALLOW (not gated) given current authorization.
function computeCeiling(auth: AuthorizationContext, criticality: BusinessCriticality): TestDepth {
  if (!auth.authorized || !auth.scopeConfirmed) return 'PASSIVE'
  if (!auth.targetIdentityVerified) return 'PASSIVE'

  const strict = criticality === 'crown-jewel' || criticality === 'high'

  // CONTROLLED_EXECUTION needs a window; IMPACT_VALIDATION needs window + approver.
  if (auth.maintenanceWindow && auth.approver) return 'IMPACT_VALIDATION'
  if (auth.maintenanceWindow && !strict) return 'CONTROLLED_EXECUTION'
  if (!strict) return 'LOW_IMPACT'
  // Strict assets: without an approver, cap at LOW_IMPACT.
  return auth.approver ? 'LOW_IMPACT' : 'LOW_IMPACT'
}
