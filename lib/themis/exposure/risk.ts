// Deterministic risk engine — pluggable, no LLM.
//
// The LLM may explain a score; it never assigns one. This is a pure function of
// evidenced factors. Swap `defaultRiskModel` for a better-calibrated model
// without changing callers. Confidence is capped by the weakest evidenced input,
// so a confident-sounding case with thin evidence scores as low-confidence.

import {
  BusinessCriticality,
  Confidence,
  DetectionState,
  ExploitabilityState,
  ExposureState,
  ImpactState,
  RiskAssessment,
} from './types'

export interface RiskContext {
  threatLikelihood: number       // 0..1 — from KEV/EPSS/observed use
  exposure: ExposureState
  exploitability: ExploitabilityState
  exploitabilityConfidence: Confidence
  criticality: BusinessCriticality
  impact: ImpactState
  detection: DetectionState
}

export interface RiskModel {
  evaluate(ctx: RiskContext): RiskAssessment
}

function exposureWeight(s: ExposureState): number {
  switch (s) {
    case 'NOT_APPLICABLE': return 0
    case 'NO_EXPOSURE': return 0.1
    case 'POTENTIAL_EXPOSURE': return 0.6
    case 'VALIDATION_REQUIRED': return 0.8
  }
}

function exploitabilityWeight(s: ExploitabilityState): number {
  switch (s) {
    case 'CONFIRMED': return 1.0
    case 'NOT_VALIDATED': return 0.5   // unproven — neither cleared nor confirmed
    case 'UNKNOWN': return 0.5
    case 'NOT_EXPLOITABLE': return 0.05
  }
}

function criticalityWeight(c: BusinessCriticality): number {
  switch (c) {
    case 'crown-jewel': return 1.0
    case 'high': return 0.8
    case 'medium': return 0.5
    case 'low': return 0.2
    case 'unknown': return 0.5
  }
}

function impactWeight(i: ImpactState): number {
  switch (i) {
    case 'CROWN_JEWEL_REACHABLE': return 1.0
    case 'LIMITED': return 0.5
    case 'CONTAINED': return 0.2
    case 'UNKNOWN': return 0.5       // absence of a mapped path is not safety
  }
}

// Control weakness is HIGH when controls missed, LOW when they prevented.
function controlWeakness(d: DetectionState): number {
  switch (d) {
    case 'PREVENTED': return 0.1
    case 'DETECTED': return 0.4
    case 'LOGGED_ONLY': return 0.7
    case 'MISSED': return 1.0
    case 'NOT_TESTED': return 0.6    // untested controls are not credited
  }
}

function bandFor(score: number, confidence: Confidence): RiskAssessment['band'] {
  if (confidence === 'unknown') return 'unknown'
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 35) return 'medium'
  if (score >= 10) return 'low'
  return 'informational'
}

// The score's confidence cannot exceed the exploitability evidence's confidence,
// and drops when key inputs are UNKNOWN.
function overallConfidence(ctx: RiskContext): Confidence {
  const unknowns =
    (ctx.impact === 'UNKNOWN' ? 1 : 0) +
    (ctx.exploitability === 'UNKNOWN' ? 1 : 0) +
    (ctx.detection === 'NOT_TESTED' ? 1 : 0)

  if (ctx.exploitabilityConfidence === 'unknown') return 'unknown'
  if (unknowns >= 2) return 'low'
  if (ctx.exploitabilityConfidence === 'low') return 'low'
  if (ctx.exploitabilityConfidence === 'medium' || unknowns === 1) return 'medium'
  return 'high'
}

export const defaultRiskModel: RiskModel = {
  evaluate(ctx: RiskContext): RiskAssessment {
    const factors = {
      threatLikelihood: clamp01(ctx.threatLikelihood),
      exposure: exposureWeight(ctx.exposure),
      exploitability: exploitabilityWeight(ctx.exploitability),
      businessCriticality: criticalityWeight(ctx.criticality),
      attackPathImpact: impactWeight(ctx.impact),
      controlWeakness: controlWeakness(ctx.detection),
    }

    // Weighted product-sum. Exposure and exploitability gate the whole score:
    // if the vulnerability does not apply or is proven not exploitable, risk
    // collapses regardless of how critical the asset is.
    const gate = factors.exposure * factors.exploitability
    const weighted =
      0.25 * factors.threatLikelihood +
      0.25 * factors.businessCriticality +
      0.25 * factors.attackPathImpact +
      0.25 * factors.controlWeakness

    const score = Math.round(gate * weighted * 100)
    const confidence = overallConfidence(ctx)
    const band = bandFor(score, confidence)

    const rationale: string[] = [
      `exposure=${ctx.exposure} (${factors.exposure}) × exploitability=${ctx.exploitability} (${factors.exploitability}) gate the score`,
      `criticality=${ctx.criticality}, impact=${ctx.impact}, detection=${ctx.detection}, threat=${factors.threatLikelihood}`,
      `score ${score}/100, band ${band}, confidence ${confidence} (capped by weakest evidenced input)`,
    ]

    return { score, band, factors, confidence, rationale }
  },
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export function evaluateRisk(ctx: RiskContext, model: RiskModel = defaultRiskModel): RiskAssessment {
  return model.evaluate(ctx)
}

// Threat likelihood from the signals the caller supplies, deterministically.
// KEV presence dominates; EPSS fills in when KEV is absent.
export function threatLikelihoodFrom(kevListed?: boolean, epss?: number): number {
  if (kevListed) return 1.0
  if (typeof epss === 'number' && !Number.isNaN(epss)) return clamp01(epss)
  return 0.3   // baseline when no exploitation signal is available
}
