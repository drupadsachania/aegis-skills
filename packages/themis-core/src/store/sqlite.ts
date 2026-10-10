// ThemisStore on node:sqlite (Node >= 22.13). Synchronous by design: statements
// are tiny and local. Loaded through process.getBuiltinModule so (a) Jest 29,
// which cannot resolve prefix-only built-ins, and (b) bundlers never see a
// static require, and (c) the ExperimentalWarning only appears once a store opens.
import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type { ApprovalRequest, AuditEvent, RunState, ThemisStore } from '../contracts'
import { auditEvent } from '../audit-log'
import { redactDeep } from '../redact'
import { themisHome } from './home'
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './schema'
import { assertDecision, assertNewApproval, assertRun, clampLimit } from './rules'

type Row = Record<string, unknown>

function loadSqlite(): typeof import('node:sqlite') {
  const p = process as unknown as { getBuiltinModule?: (id: string) => unknown }
  if (typeof p.getBuiltinModule !== 'function') throw new Error('Themis needs Node.js >= 22.13 (node:sqlite).')
  const mod = p.getBuiltinModule('node:sqlite') as typeof import('node:sqlite') | undefined
  if (!mod) throw new Error('node:sqlite is unavailable in this Node.js build.')
  return mod
}

function migrate(db: DatabaseSync): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)')
  const max = Number((db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as Row | undefined)?.v ?? 0)
  if (max > LATEST_SCHEMA_VERSION) {
    throw new Error(`themis.db schema v${max} is newer than this Themis supports (v${LATEST_SCHEMA_VERSION}). Upgrade Themis.`)
  }
  for (const m of MIGRATIONS) {
    db.exec('BEGIN IMMEDIATE')
    try {
      // Re-check inside the write lock: another process may have migrated first.
      if (!db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(m.version)) {
        db.exec(m.sql)
        db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(m.version, new Date().toISOString())
      }
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
}

const json = (v: unknown): string => JSON.stringify(redactDeep(v) ?? null)

function toApproval(r: Row): ApprovalRequest {
  return {
    id: String(r.id), runId: String(r.run_id), serverId: String(r.server_id), tool: String(r.tool),
    toolClass: r.tool_class as ApprovalRequest['toolClass'], args: JSON.parse(String(r.args)),
    reason: String(r.reason), status: r.status as ApprovalRequest['status'],
    decidedBy: r.decided_by === 'human' ? 'human' : null, createdAt: String(r.created_at),
    decidedAt: r.decided_at == null ? null : String(r.decided_at),
  }
}

/** Opens (and migrates) a store. Default `${themisHome()}/themis.db`; ':memory:' for tests. */
export function openStore(file: string = path.join(themisHome(), 'themis.db')): ThemisStore {
  const { DatabaseSync } = loadSqlite()
  const memory = file === ':memory:'
  if (!memory) fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(file)
  try {
    db.exec('PRAGMA busy_timeout = 5000')
    if (!memory) db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA synchronous = NORMAL')
    migrate(db)
  } catch (e) {
    db.close()
    throw e
  }
  let open = true

  const insertAudit = (e: AuditEvent): void => {
    db.prepare('INSERT INTO audit_events (id, run_id, at, kind, data) VALUES (?, ?, ?, ?, ?)').run(e.id, e.runId, e.at, e.kind, json(e.data))
  }
  const tx = <T>(fn: () => T): T => {
    db.exec('BEGIN IMMEDIATE')
    try { const out = fn(); db.exec('COMMIT'); return out } catch (e) { db.exec('ROLLBACK'); throw e }
  }

  return {
    saveRun(run) {
      assertRun(run)
      db.prepare(`INSERT INTO runs (run_id, status, step, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_id) DO UPDATE SET status = excluded.status, step = excluded.step,
        updated_at = excluded.updated_at, data = excluded.data`)
        .run(run.runId, run.status, run.step, run.createdAt, run.updatedAt, JSON.stringify(run))
    },
    getRun(runId) {
      const r = db.prepare('SELECT data FROM runs WHERE run_id = ?').get(runId) as Row | undefined
      return r ? (JSON.parse(String(r.data)) as RunState) : null
    },
    listRuns(limit) {
      return (db.prepare('SELECT data FROM runs ORDER BY updated_at DESC, run_id ASC LIMIT ?').all(clampLimit(limit)) as Row[])
        .map((r) => JSON.parse(String(r.data)) as RunState)
    },
    appendAudit(e) { insertAudit(e) },
    listAudit(runId) {
      return (db.prepare('SELECT id, run_id, at, kind, data FROM audit_events WHERE run_id = ? ORDER BY seq ASC').all(runId) as Row[])
        .map((r) => ({ id: String(r.id), runId: String(r.run_id), at: String(r.at), kind: r.kind as AuditEvent['kind'], data: JSON.parse(String(r.data)) }))
    },
    putApproval(a) {
      assertNewApproval(a)
      try {
        db.prepare(`INSERT INTO approvals (id, run_id, server_id, tool, tool_class, args, reason, status, decided_by, created_at, decided_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, NULL)`)
          .run(a.id, a.runId, a.serverId, a.tool, a.toolClass, json(a.args), a.reason, a.createdAt)
      } catch (e) {
        if (/UNIQUE|PRIMARY KEY/i.test(String(e))) throw new Error(`approval ${a.id} already exists`)
        throw e
      }
    },
    getApproval(id) {
      const r = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as Row | undefined
      return r ? toApproval(r) : null
    },
    listApprovals(filter = {}) {
      const where: string[] = []
      const params: string[] = []
      if (filter.runId) { where.push('run_id = ?'); params.push(filter.runId) }
      if (filter.status) { where.push('status = ?'); params.push(filter.status) }
      const sql = `SELECT * FROM approvals${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY rowid ASC`
      return (db.prepare(sql).all(...params) as Row[]).map(toApproval)
    },
    decideApproval(id, decision) {
      assertDecision(decision)
      return tx(() => {
        const at = new Date().toISOString()
        const res = db.prepare("UPDATE approvals SET status = ?, decided_by = 'human', decided_at = ? WHERE id = ? AND status = 'pending'").run(decision, at, id)
        if (Number(res.changes) !== 1) throw new Error(`approval ${id} is not pending or does not exist`)
        const a = toApproval(db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as Row)
        insertAudit(auditEvent(a.runId, 'approval_decided', { approvalId: id, decision, decidedBy: 'human' }, at))
        return a
      })
    },
    close() {
      if (open) { open = false; db.close() }
    },
  }
}
