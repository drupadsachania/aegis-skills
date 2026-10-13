import { createHash } from 'node:crypto'
import type { Confidence, EvidenceInput, ExposureCase, ExposureReport, ExposureState, ExploitabilityState, ImpactAssessment, RiskDelta, ValidationFailure, WorkflowState } from './types'
import { evaluateRisk, type RiskContext } from './risk'
import type { VerificationResult } from './verify'

export function caseIdFrom(input: string): string {
  return 'exp-' + createHash('sha256').update(input).digest('hex').slice(0, 16)
}

// Exploitability is CONFIRMED only with exploitation evidence. This workflow does
// not execute, so without such evidence the state is NOT_VALIDATED, attributed to
// NO_EXECUTION_LAYER — never silently downgraded to NOT_EXPLOITABLE.
export function determineExploitability(req: { providedEvidence?: EvidenceInput[] }): {
  state: ExploitabilityState
  confidence: Confidence
  failure?: ValidationFailure
} {
  const exploitEv = (req.providedEvidence ?? []).filter((e) => e.type === 'exploitation')
  if (exploitEv.length >= 2) return { state: 'CONFIRMED', confidence: 'high' }
  if (exploitEv.length === 1) return { state: 'CONFIRMED', confidence: 'medium' }
  return { state: 'NOT_VALIDATED', confidence: 'unknown', failure: 'NO_EXECUTION_LAYER' }
}

export function deriveWorkflowState(
  exposure: ExposureCase['states']['exposure'],
  exploitability: ExploitabilityState,
  verification: ExposureCase['states']['verification'],
  policyDecision: string,
  _impact: ExposureCase['states']['impact'],
): WorkflowState {
  if (exposure === 'NOT_APPLICABLE' || exposure === 'NO_EXPOSURE') {
    return verification === 'VERIFIED_CLOSED' ? 'VERIFIED_CLOSED' : 'ASSESSED'
  }
  if (verification === 'VERIFIED_CLOSED') return 'VERIFIED_CLOSED'
  if (verification === 'FAILED') return 'REOPENED'
  if (verification === 'PARTIAL') return 'CONTROLLED'
  if (exploitability === 'CONFIRMED') return 'CONFIRMED_EXPOSURE'
  if (policyDecision === 'DENY') return 'BLOCKED'
  return 'VALIDATION_PENDING'
}

export function buildExplain(
  c: ExposureCase,
  impact: ImpactAssessment,
  risk: RiskDelta,
  correlationRationale: string,
  policyDecision: string,
): ExposureReport['explain'] {
  return {
    whyExposed:
      c.states.exposure === 'NOT_APPLICABLE'
        ? 'The vulnerability does not apply to this asset.'
        : correlationRationale || `Exposure state: ${c.states.exposure}.`,
    whyItMatters:
      impact.reachesCrownJewel
        ? 'A path reaches a crown-jewel asset.'
        : `Impact assessed as ${impact.state}.`,
    whatProvesExploitability:
      c.states.exploitability === 'CONFIRMED'
        ? 'Exploitation evidence was supplied and meets the proof bar.'
        : c.validationFailure === 'NO_EXECUTION_LAYER'
          ? 'Not validated: this workflow plans and reasons but does not execute; supply exploitation evidence to confirm.'
          : `Exploitability: ${c.states.exploitability}.`,
    assetAffected: c.assetId ? `Asset ${c.assetId}.` : 'Asset not specified.',
    controlOutcome:
      c.states.detection === 'NOT_TESTED'
        ? 'Control effectiveness not tested (no telemetry supplied).'
        : `Detection outcome: ${c.states.detection}.`,
    remediation: `Remediation: ${c.states.remediation}; policy decision for validation: ${policyDecision}.`,
    whatProvesClosed:
      risk.proven
        ? `Retest confirmed closure; risk reduced ${risk.before.score} → ${risk.after?.score} (delta ${risk.delta}).`
        : 'Closure not proven — no passing retest evidence supplied.',
  }
}

export function noExposureImpact(): ImpactAssessment {
  return { state: 'CONTAINED', path: [], reachesCrownJewel: false, notes: 'No exposure — no onward path.' }
}

/** Risk before, and risk after only when verification evidence exists. */
export function riskDelta(before: RiskContext, v: VerificationResult, exposure: ExposureState): RiskDelta {
  const riskBefore = evaluateRisk(before)
  if (v.verification === 'VERIFIED_CLOSED' || v.verification === 'PARTIAL' || v.verification === 'FAILED') {
    const riskAfter = evaluateRisk({
      ...before,
      exploitability: v.exploitabilityAfter,
      // A verified-closed case re-assesses exposure as removed.
      exposure: v.verification === 'VERIFIED_CLOSED' ? 'NO_EXPOSURE' : exposure,
    })
    return { before: riskBefore, after: riskAfter, delta: riskBefore.score - riskAfter.score, proven: v.verification === 'VERIFIED_CLOSED' }
  }
  return { before: riskBefore, after: null, delta: null, proven: false }
}
