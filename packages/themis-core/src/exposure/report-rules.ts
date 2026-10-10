import type { ExposureCase, ImpactAssessment, RiskDelta, ValidationPlan } from './types'

export interface ReportInput {
  case: ExposureCase
  plan: ValidationPlan
  impact: ImpactAssessment
  risk: RiskDelta
  correlationRationale: string
}

/** Structured, authoritative facts the model may explain but never change. */
export function caseFacts(input: ReportInput) {
  return {
    workflowState: input.case.workflowState,
    states: input.case.states,
    exploitabilityConfidence: input.case.exploitabilityConfidence,
    validationFailure: input.case.validationFailure ?? null,
    riskBefore: input.risk.before.score,
    riskAfter: input.risk.after?.score ?? null,
    riskBand: input.risk.before.band,
    riskProven: input.risk.proven,
    impact: input.impact.state,
    reachesCrownJewel: input.impact.reachesCrownJewel,
    planBlocked: input.plan.blocked,
    planDepth: input.plan.depth,
  }
}
