import type { Finding } from './types'
import { redactSecrets } from '../secrets'

/** Parse assessor output; free-text fields are redacted. Throws on invalid JSON. */
export function parseAssessorFindings(content: string, redact: (s: string) => string = redactSecrets): Finding[] {
  const parsed = JSON.parse(content) as unknown
  const findings: Finding[] = Array.isArray(parsed) ? (parsed as Finding[]) : []
  return findings.map((f) => ({
    ...f,
    evidence: redact(f.evidence ?? ''),
    recommendation: redact(f.recommendation ?? ''),
  }))
}
