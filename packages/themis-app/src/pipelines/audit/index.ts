import { selectStandards, skillsForStandards, score, type AuditRequest, type AuditReport } from '@aegis-skills/themis-core'
import { ingest } from './ingest'
import { assess } from './assessor'
import { report } from './reporter'

export async function audit(req: AuditRequest): Promise<AuditReport> {
  const start = Date.now()

  const { sanitisedInput, detectedSystemType, applicableSkills } = await ingest(req)
  const standards = selectStandards(req, detectedSystemType)
  const standardSkills = skillsForStandards(standards)
  const mergedSkills = [...new Set([...applicableSkills, ...standardSkills])].slice(0, 6)
  const findings = await assess(sanitisedInput, standards, mergedSkills, req.context)
  const summary = score(findings)
  const executiveSummary = await report(req, findings, standards, mergedSkills)

  return {
    executiveSummary,
    standardsApplied: standards,
    findings,
    summary,
    skillTrace: mergedSkills,
    durationMs: Date.now() - start,
  }
}
