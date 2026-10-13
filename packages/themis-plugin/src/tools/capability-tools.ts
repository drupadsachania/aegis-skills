// Direct access to themis-core's deterministic security capabilities: no workflow
// step and no model. The host supplies facts (including any reasoning-derived
// states such as exposure and impact); core decides policy, detection,
// exploitability, verification and risk.
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  authorize, assessDetection, verify, evaluateRisk, threatLikelihoodFrom, determineExploitability,
  riskDelta, redactDeep, redactSecrets, auditEvent,
  type EvidenceInput, type RiskContext, type Finding,
} from '@aegis-skills/themis-core'
import type { PluginDeps } from '../deps'
import { textResult, errorResult } from '../errors'

const EvidenceType = z.enum(['asset', 'network', 'configuration', 'software', 'vulnerability', 'exploitation', 'telemetry', 'edr', 'siem', 'remediation', 'verification'])
const Criticality = z.enum(['crown-jewel', 'high', 'medium', 'low', 'unknown'])
const Exposure = z.enum(['NOT_APPLICABLE', 'NO_EXPOSURE', 'POTENTIAL_EXPOSURE', 'VALIDATION_REQUIRED'])
const Impact = z.enum(['CROWN_JEWEL_REACHABLE', 'LIMITED', 'CONTAINED', 'UNKNOWN'])
const Depth = z.enum(['PASSIVE', 'LOW_IMPACT', 'CONTROLLED_EXECUTION', 'IMPACT_VALIDATION'])

const Evidence = z.object({
  type: EvidenceType, summary: z.string().min(1).max(4000), source: z.string().min(1).max(200),
}).strict()

const Authorization = z.object({
  authorized: z.boolean(), scopeConfirmed: z.boolean(), targetIdentityVerified: z.boolean(),
  maintenanceWindow: z.boolean().optional(), approver: z.string().max(200).optional(), expiresAt: z.string().max(40).optional(),
}).strict()

const RiskInput = z.object({
  threatLikelihood: z.number().min(0).max(1),
  exposure: Exposure,
  exploitability: z.enum(['CONFIRMED', 'NOT_EXPLOITABLE', 'NOT_VALIDATED', 'UNKNOWN']),
  exploitabilityConfidence: z.enum(['high', 'medium', 'low', 'unknown']),
  criticality: Criticality,
  impact: Impact,
  detection: z.enum(['PREVENTED', 'DETECTED', 'LOGGED_ONLY', 'MISSED', 'NOT_TESTED']),
}).strict()

const FindingInput = z.object({
  controlId: z.string().min(1).max(100),
  standard: z.enum(['cis-l1', 'cis-l2', 'nist-csf', 'iso27001', 'soc2', 'pci-dss', 'hipaa', 'iec-62443', 'nist-800-53']),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'informational', 'pass']),
  title: z.string().min(1).max(300),
  evidence: z.string().max(4000),
  recommendation: z.string().max(4000),
  reference: z.string().max(500),
}).strict()

export function registerCapabilityTools(server: McpServer, deps: PluginDeps) {
  server.tool('themis_validate_exposure',
    'Run the deterministic CTEM rules over supplied evidence: authorization policy, detection, exploitability, verification and risk. ' +
    'You supply the reasoning-derived exposure and impact states; this tool never infers them and never executes anything.',
    {
      authorization: Authorization,
      requestedDepth: Depth.optional(),
      criticality: Criticality.optional(),
      exposure: Exposure,
      impact: Impact.optional(),
      kevListed: z.boolean().optional(),
      epss: z.number().min(0).max(1).optional(),
      evidence: z.array(Evidence).max(50),
    },
    async (a) => {
      try {
        const criticality = a.criticality ?? 'unknown'
        const evidence: EvidenceInput[] = a.evidence.map((e) => ({ ...e, summary: redactSecrets(e.summary) }))
        const policy = authorize(a.authorization, a.requestedDepth ?? 'CONTROLLED_EXECUTION', criticality)
        const detection = assessDetection(evidence)
        const exploit = determineExploitability({ providedEvidence: evidence })
        const v = verify(evidence, exploit.state)
        const ctx: RiskContext = {
          threatLikelihood: threatLikelihoodFrom(a.kevListed, a.epss),
          exposure: a.exposure, exploitability: exploit.state, exploitabilityConfidence: exploit.confidence,
          criticality, impact: a.impact ?? 'UNKNOWN', detection: detection.state,
        }
        return textResult(redactDeep({ policy, detection, exploitability: exploit, verification: v, risk: riskDelta(ctx, v, a.exposure) }))
      } catch (e) { return errorResult('exposure_failed', e instanceof Error ? e.message : String(e)) }
    })

  server.tool('themis_assess_risk', 'Score risk from evidenced factors with the deterministic risk model.',
    { input: RiskInput },
    async ({ input }) => {
      try { return textResult(evaluateRisk(input)) }
      catch (e) { return errorResult('risk_failed', e instanceof Error ? e.message : String(e)) }
    })

  server.tool('themis_record_finding', 'Record an analysis finding on a run (local store only).',
    { runId: z.string(), finding: FindingInput },
    async ({ runId, finding }) => {
      try {
        const run = deps.store.getRun(runId)
        if (!run) return textResult({ code: 'no_such_run', error: `no run ${runId}` })
        const clean = redactDeep(finding) as Finding
        const updated = { ...run, findings: [...run.findings, clean], updatedAt: new Date().toISOString() }
        deps.store.saveRun(updated)
        deps.store.appendAudit(auditEvent(runId, 'finding', clean))
        return textResult({ ok: true, count: updated.findings.length })
      } catch (e) { return errorResult('finding_failed', e instanceof Error ? e.message : String(e)) }
    })

  server.tool('themis_get_report', 'Get the stamped report and findings for a run.',
    { runId: z.string() },
    async ({ runId }) => {
      const run = deps.store.getRun(runId)
      if (!run) return textResult({ code: 'no_such_run', error: `no run ${runId}` })
      return textResult({ status: run.status, report: run.report, findings: run.findings, versions: run.versions })
    })
}
