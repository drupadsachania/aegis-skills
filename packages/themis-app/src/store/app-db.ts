import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'

export type AppDb = DatabaseSync

/** Same loading strategy as core's store (Phase 2): no static require of node:sqlite. */
function loadSqlite(): typeof import('node:sqlite') {
  const p = process as unknown as { getBuiltinModule?: (id: string) => unknown }
  if (typeof p.getBuiltinModule !== 'function') throw new Error('Themis needs Node.js >= 24 (node:sqlite).')
  const mod = p.getBuiltinModule('node:sqlite') as typeof import('node:sqlite') | undefined
  if (!mod) throw new Error('node:sqlite is unavailable in this Node.js build.')
  return mod
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS app_checkpoints (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  type TEXT,
  checkpoint BLOB NOT NULL,
  metadata BLOB NOT NULL,
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);
CREATE TABLE IF NOT EXISTS app_checkpoint_writes (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  channel TEXT NOT NULL,
  type TEXT,
  value BLOB,
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);
CREATE TABLE IF NOT EXISTS app_reports (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('themis', 'audit', 'exposure')),
  run_id TEXT,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  versions TEXT NOT NULL,
  markdown TEXT NOT NULL,
  body TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS app_reports_created ON app_reports (created_at DESC);
`

/** Opens (and migrates) the app-owned database. ':memory:' for tests. */
export function openAppDb(file: string): AppDb {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const { DatabaseSync } = loadSqlite()
  const db = new DatabaseSync(file)
  db.exec('PRAGMA busy_timeout = 5000;')
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;')
  db.exec(SCHEMA)
  if (file !== ':memory:' && process.platform !== 'win32') fs.chmodSync(file, 0o600)
  return db
}
