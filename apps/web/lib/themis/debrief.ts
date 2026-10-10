import fs from 'node:fs'
import path from 'node:path'
import { buildDebriefRecord, type DebriefParams } from '@aegis-skills/themis-core'

/**
 * debrief.ts — local SQLite-backed execution audit trail (website only; Phase 4
 * retires it in favour of ThemisStore). The record itself is built by
 * themis-core's buildDebriefRecord: metadata only, never task text or findings.
 *
 * Security model:
 *  - Written to local file only (data/themis.db by default, gitignored)
 *  - No network access, no cloud, no external service
 *  - Synchronous writes via better-sqlite3
 */

export type { DebriefParams }

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

export function writeDebrief(params: DebriefParams): void {
  try {
    const db = getDb()
    const rec = buildDebriefRecord(params)
    db.prepare(`
      INSERT OR IGNORE INTO themis_debrief (
        run_id, environment_profile, skills_executed, skill_confidence,
        guardrail_verdicts, pattern_tags, control_gaps, duration_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rec.runId,
      JSON.stringify(rec.environmentProfile),
      JSON.stringify(rec.skills),
      JSON.stringify(rec.skillConfidence),
      JSON.stringify(rec.guardrailVerdicts),
      JSON.stringify(rec.patternTags),
      rec.controlGaps,
      rec.durationMs,
      rec.createdAt,
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
