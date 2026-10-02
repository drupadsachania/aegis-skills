import { createHash } from 'node:crypto'
import { redactSecrets } from '@/lib/themis/secrets'
import {
  ExposureCase,
  ExposureReport,
  ExposureRequest,
  ExploitabilityState,
  Confidence,
  ImpactAssessment,
  RiskDelta,
  ValidationFailure,
  WorkflowState,
} from './types'
import { ingest } from './ingest'
import { correlate } from './correlate'
import { authorize } from './policy'
import { plan as buildPlan } from './planner'
import { assessImpact } from './attackpath'
import { assessDetection } from './detection'
import { verify } from './verify'
import { evaluateRisk, threatLikelihoodFrom, RiskContext } from './risk'
import { report } from './report'

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

function caseIdFrom(input: string): string {
  return 'exp-' + createHash('sha256').update(input).digest('hex').slice(0, 16)
}

// Exploitability is CONFIRMED only with exploitation evidence. This workflow does
// not execute, so without such evidence the state is NOT_VALIDATED, attributed to
// NO_EXECUTION_LAYER — never silently downgraded to NOT_EXPLOITABLE.
function determineExploitability(req: ExposureRequest): {
  state: ExploitabilityState
  confidence: Confidence
  failure?: ValidationFailure
} {
  const exploitEv = (req.providedEvidence ?? []).filter((e) => e.type === 'exploitation')
  if (exploitEv.length >= 2) return { state: 'CONFIRMED', confidence: 'high' }
  if (exploitEv.length === 1) return { state: 'CONFIRMED', confidence: 'medium' }
  return { state: 'NOT_VALIDATED', confidence: 'unknown', failure: 'NO_EXECUTION_LAYER' }
}

export async function validateExposure(req: ExposureRequest): Promise<ExposureReport> {
  const start = Date.now()

  // 1. Ingest (sanitise + redact + classify)
  const { sanitisedInput, detectedProduct, applicableSkills } = await ingest(req)

  // 2. Correlate exposure (does it apply + reachable?)
  const correlation = await correlate(sanitisedInput, detectedProduct, req)

  // Short-circuit when the vulnerability does not apply or is unreachable.
  const criticality = req.context.businessCriticality ?? 'unknown'
  const threatLikelihood = threatLikelihoodFrom(req.kevListed, req.epss)

  // 3. Exploitability (evidence-driven; no execution here)
  const exploit = determineExploitability(req)

  // 4. Detection (deterministic from supplied telemetry)
  const detection = assessDetection(req.providedEvidence ?? [])

  // 5. Impact / attack path (only meaningful if there is some exposure)
  const impact =
    correlation.exposure === 'NOT_APPLICABLE' || correlation.exposure === 'NO_EXPOSURE'
      ? { state: 'CONTAINED' as const, path: [], reachesCrownJewel: false, notes: 'No exposure — no onward path.' }
      : await assessImpact(sanitisedInput, req)

  // 6. Policy gate — deterministic. Requested depth is the plan's ambition;
  // here we authorize up to CONTROLLED_EXECUTION (the deepest safe tier the
  // registry offers for a proof). The planner is then capped by the ceiling.
  const policy = authorize(req.authorization, 'CONTROLLED_EXECUTION', criticality)

  // 7. Validation plan (from registry, within policy ceiling; never executed)
  const claim =
    exploit.state === 'CONFIRMED'
      ? 'Re-verify the confirmed exposure after remediation.'
      : `Establish whether ${req.cve ?? 'the vulnerability'} is exploitable on this asset.`
  const plan = await buildPlan(claim, sanitisedInput, policy)

  // 8. Risk BEFORE (deterministic)
  const riskCtxBefore: RiskContext = {
    threatLikelihood,
    exposure: correlation.exposure,
    exploitability: exploit.state,
    exploitabilityConfidence: exploit.confidence,
    criticality,
    impact: impact.state,
    detection: detection.state,
  }
  const riskBefore = evaluateRisk(riskCtxBefore)

  // 9. Remediation + verification (deterministic from evidence)
  const v = verify(req.providedEvidence ?? [], exploit.state)

  // Risk AFTER — only computed when verification evidence exists.
  let risk: RiskDelta
  if (v.verification === 'VERIFIED_CLOSED' || v.verification === 'PARTIAL' || v.verification === 'FAILED') {
    const riskAfter = evaluateRisk({
      ...riskCtxBefore,
      exploitability: v.exploitabilityAfter,
      // A verified-closed case re-assesses exposure as removed.
      exposure: v.verification === 'VERIFIED_CLOSED' ? 'NO_EXPOSURE' : correlation.exposure,
    })
    risk = {
      before: riskBefore,
      after: riskAfter,
      delta: riskBefore.score - riskAfter.score,
      proven: v.verification === 'VERIFIED_CLOSED',
    }
  } else {
    risk = { before: riskBefore, after: null, delta: null, proven: false }
  }

  // 10. Workflow state — deterministic lifecycle position.
  const workflowState = deriveWorkflowState(correlation.exposure, exploit.state, v.verification, policy.decision, impact.state)

  const exposureCase: ExposureCase = {
    caseId: caseIdFrom(sanitisedInput),
    cve: req.cve,
    assetId: req.context.assetId,
    workflowState,
    states: {
      exposure: correlation.exposure,
      exploitability: v.verification === 'NOT_VERIFIED' ? exploit.state : v.exploitabilityAfter,
      impact: impact.state,
      detection: detection.state,
      remediation: v.remediation,
      verification: v.verification,
    },
    exploitabilityConfidence: exploit.confidence,
    validationFailure: exploit.failure,
  }

  // 11. Report (LLM explains; never authority)
  const executiveSummary = await report({
    case: exposureCase,
    plan,
    impact,
    risk,
    correlationRationale: correlation.rationale,
  })

  const skillTrace = [...new Set([...applicableSkills, 'risk-management', 'security-operations'])].slice(0, 6)

  // Supabase log — only metadata, never content. Never throws.
  try {
    const client = getSupabaseClient()
    if (client) {
      await client.from('themis_exposure_log').insert({
        case_id: exposureCase.caseId,
        cve: req.cve ?? null,
        workflow_state: workflowState,
        exposure_state: correlation.exposure,
        exploitability_state: exposureCase.states.exploitability,
        impact_state: impact.state,
        detection_state: detection.state,
        policy_decision: policy.decision,
        risk_before: riskBefore.score,
        risk_after: risk.after?.score ?? null,
        risk_proven: risk.proven,
        skill_slugs: skillTrace,
        duration_ms: Date.now() - start,
      })
    }
  } catch {
    // Logging failure must never propagate.
  }

  return {
    case: exposureCase,
    plan,
    impact,
    risk,
    policy,
    evidence: (req.providedEvidence ?? []).map((e) => ({
      ...e,
      summary: redactSecrets(e.summary),
    })),
    executiveSummary,
    explain: buildExplain(exposureCase, impact, risk, correlation.rationale, policy.decision),
    skillTrace,
    durationMs: Date.now() - start,
  }
}

function deriveWorkflowState(
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

function buildExplain(
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
