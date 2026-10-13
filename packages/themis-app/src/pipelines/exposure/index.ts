import { redactSecrets, authorize, assessDetection, verify, threatLikelihoodFrom, caseIdFrom, determineExploitability, deriveWorkflowState, buildExplain, riskDelta, noExposureImpact, type ExposureCase, type ExposureReport, type ExposureRequest, type RiskContext } from '@aegis-skills/themis-core'
import { ingest } from './ingest'
import { correlate } from './correlate'
import { plan as buildPlan } from './planner'
import { assessImpact } from './attackpath'
import { report } from './report'

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
      ? noExposureImpact()
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
  const v = verify(req.providedEvidence ?? [], exploit.state)
  const risk = riskDelta(riskCtxBefore, v, correlation.exposure)

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
