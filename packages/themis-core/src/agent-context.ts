// Integrity rules for skill-phase content and the read_findings view, shared by
// mode 1 (host AI tools) and mode 2 (LangGraph tools).
import type { SubTaskResult } from './types'

export const MAX_PHASE_CONTENT_CHARS = 8000
// `data:` is narrowed to URI scheme context to avoid false-positives on prose text
const BLOCKED_CONTENT_PATTERNS = [/<script/i, /javascript:/i, /\bdata:[a-z]/i, /eval\(/i]

export function validatePhaseContent(text: string): boolean {
  if (text.length > MAX_PHASE_CONTENT_CHARS) return false
  return !BLOCKED_CONTENT_PATTERNS.some((p) => p.test(text))
}

/** Render findings for another agent. Empty `skill` = all skills. */
export function formatFindings(
  results: Pick<SubTaskResult, 'skill' | 'subTaskId' | 'confidence' | 'findings'>[],
  skill: string,
): string {
  const filtered = skill ? results.filter((r) => r.skill === skill) : results
  if (filtered.length === 0) {
    return `No findings available${skill ? ` for skill "${skill}"` : ''} yet.`
  }
  return filtered
    .map((r) => `[${r.skill} / ${r.subTaskId}] (confidence: ${r.confidence})\n${r.findings}`)
    .join('\n\n---\n\n')
}
