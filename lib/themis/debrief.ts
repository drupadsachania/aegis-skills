import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { SubTaskResult } from './types'

/**
 * debrief.ts — local SQLite-backed execution audit trail.
 *
 * Security model:
 *  - Written to local file only (data/themis.db by default, gitignored)
 *  - No network access, no cloud, no external service
 *  - Synchronous writes via better-sqlite3 (fast, no async complexity)
 *  - Schema stores ONLY metadata: hashes, skill slugs, verdict counts,
 *    environment profile, pattern tags, duration
 *  - NEVER stores: task content, findings text, LLM outputs, user input
 *
 * The run_id is a truncated SHA-256 of (task + timestamp) — correlates
 * runs without being reconstructible to the original task.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
type Database = import('better-sqlite3').Database
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BetterSqlite3 = require('better-sqlite3') as (path: string) => Database

function getDbPath(): string {
  return process.env.THEMIS_DB_PATH ?? path.join(process.cwd(), 'data', 'themis.db')
}

let _db: Database | null = null

function getDb(): Database {
  if (_db) return _db
  const dbPath = getDbPath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  _db = BetterSqlite3(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.exec(`
    CREATE TABLE IF NOT EXISTS themis_debrief (
      run_id              TEXT PRIMARY KEY,
      environment_profile TEXT NOT NULL,
      skills_executed     TEXT NOT NULL,
      skill_confidence    TEXT NOT NULL,
      guardrail_verdicts  TEXT NOT NULL,
      pattern_tags        TEXT NOT NULL,
      control_gaps        INTEGER NOT NULL DEFAULT 0,
      duration_ms         INTEGER NOT NULL,
      created_at          TEXT NOT NULL
    )
  `)
  return _db
}

/** Derives abstract tags from results — confidence/skill patterns only. */
function extractPatternTags(
  results: SubTaskResult[],
  verdicts: { passed: number; flagged: number; blocked: number }
): string[] {
  const tags: string[] = []
  const skills = [...new Set(results.map(r => r.skill))]
  skills.forEach(s => tags.push(`skill:${s}`))
  if (results.some(r => r.confidence === 'low')) tags.push('low-confidence')
  if (verdicts.flagged > 0) tags.push('flagged')
  if (verdicts.blocked > 0) tags.push('blocked')
  if (verdicts.passed === results.length && results.length > 0) tags.push('all-passed')
  return tags
}

export interface DebriefParams {
  task: string          // used only for hashing — never stored
  environmentProfile: string[]
  skills: string[]
  results: SubTaskResult[]
  guardrailVerdicts: { passed: number; flagged: number; blocked: number }
  durationMs: number
}

export function writeDebrief(params: DebriefParams): void {
  try {
    const db = getDb()

    // Hash(task + timestamp) — short, non-reversible run identifier
    const runId = crypto
      .createHash('sha256')
      .update(params.task + Date.now().toString())
      .digest('hex')
      .slice(0, 16)

    const skillConfidence = Object.fromEntries(
      params.results.map(r => [r.skill, r.confidence])
    )
    const patternTags = extractPatternTags(params.results, params.guardrailVerdicts)
    const controlGaps = params.results.filter(r => r.confidence === 'low').length

    db.prepare(`
      INSERT OR IGNORE INTO themis_debrief (
        run_id, environment_profile, skills_executed, skill_confidence,
        guardrail_verdicts, pattern_tags, control_gaps, duration_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId,
      JSON.stringify(params.environmentProfile),
      JSON.stringify(params.skills),
      JSON.stringify(skillConfidence),
      JSON.stringify(params.guardrailVerdicts),
      JSON.stringify(patternTags),
      controlGaps,
      params.durationMs,
      new Date().toISOString()
    )
  } catch {
    // Debrief failure must never surface to the caller or affect the response.
  }
}

/** Call during server shutdown / test teardown to release the file handle. */
export function closeDb(): void {
  if (_db) {
    try { _db.close() } catch { /* ignore */ }
    _db = null
  }
}
