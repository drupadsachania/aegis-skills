// Metadata-only run record (no task text, no findings). Built here so mode 2 can
// persist the same record into ThemisStore when debrief.ts is retired (Phase 4).
import { createHash } from 'node:crypto'
import type { SubTaskResult } from './types'

export interface GuardrailCounts { passed: number; flagged: number; blocked: number }

export interface DebriefParams {
  task: string          // used only for hashing — never stored
  environmentProfile: string[]
  skills: string[]
  results: SubTaskResult[]
  guardrailVerdicts: GuardrailCounts
  durationMs: number
}

export interface DebriefRecord {
  runId: string
  environmentProfile: string[]
  skills: string[]
  skillConfidence: Record<string, SubTaskResult['confidence']>
  guardrailVerdicts: GuardrailCounts
  patternTags: string[]
  controlGaps: number
  durationMs: number
  createdAt: string
}

/** Derives abstract tags from results — confidence/skill patterns only. */
export function extractPatternTags(results: SubTaskResult[], verdicts: GuardrailCounts): string[] {
  const tags: string[] = []
  const skills = [...new Set(results.map((r) => r.skill))]
  skills.forEach((s) => tags.push(`skill:${s}`))
  if (results.some((r) => r.confidence === 'low')) tags.push('low-confidence')
  if (verdicts.flagged > 0) tags.push('flagged')
  if (verdicts.blocked > 0) tags.push('blocked')
  if (verdicts.passed === results.length && results.length > 0) tags.push('all-passed')
  return tags
}

export function buildDebriefRecord(params: DebriefParams, now: number = Date.now()): DebriefRecord {
  return {
    // Hash(task + timestamp) — short, non-reversible run identifier
    runId: createHash('sha256').update(params.task + now.toString()).digest('hex').slice(0, 16),
    environmentProfile: params.environmentProfile,
    skills: params.skills,
    skillConfidence: Object.fromEntries(params.results.map((r) => [r.skill, r.confidence])),
    guardrailVerdicts: params.guardrailVerdicts,
    patternTags: extractPatternTags(params.results, params.guardrailVerdicts),
    controlGaps: params.results.filter((r) => r.confidence === 'low').length,
    durationMs: params.durationMs,
    createdAt: new Date(now).toISOString(),
  }
}
