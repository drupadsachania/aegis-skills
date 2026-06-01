import { createHash } from 'node:crypto'
import { AuditRequest, AuditReport } from './types'
import { ingest } from './ingest'
import { selectStandards } from './standards'
import { assess } from './assessor'
import { score } from './scorer'
import { report } from './reporter'

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export async function audit(req: AuditRequest): Promise<AuditReport> {
  const start = Date.now()

  const { sanitisedInput, detectedSystemType, applicableSkills } = await ingest(req)
  const standards = selectStandards(req, detectedSystemType)
  const findings = await assess(sanitisedInput, standards, applicableSkills, req.context)
  const summary = score(findings)
  const executiveSummary = await report(req, findings, standards, applicableSkills)

  // Write Supabase audit log — wrap in try/catch, never throw
  try {
    const client = getSupabaseClient()
    if (client) {
      const inputHash = createHash('sha256').update(sanitisedInput).digest('hex')
      await client.from('themis_audit_log').insert({
        input_hash: inputHash,
        standards_applied: standards,
        severity_counts: summary,
        skill_slugs: applicableSkills,
        duration_ms: Date.now() - start,
      })
    }
  } catch {
    // Audit log failure must never propagate to caller
  }

  return {
    executiveSummary,
    standardsApplied: standards,
    findings,
    summary,
    skillTrace: applicableSkills,
    durationMs: Date.now() - start,
  }
}
