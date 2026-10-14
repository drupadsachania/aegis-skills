// Ordered, append-only migrations. Never edit a shipped migration; add a new one.
export const MIGRATIONS: ReadonlyArray<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE runs (
        run_id     TEXT PRIMARY KEY,
        status     TEXT NOT NULL,
        step       TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        data       TEXT NOT NULL CHECK (json_valid(data))
      );
      CREATE INDEX runs_updated ON runs (updated_at DESC);

      CREATE TABLE audit_events (
        seq    INTEGER PRIMARY KEY AUTOINCREMENT,
        id     TEXT NOT NULL UNIQUE,
        run_id TEXT NOT NULL,
        at     TEXT NOT NULL,
        kind   TEXT NOT NULL,
        data   TEXT NOT NULL CHECK (json_valid(data))
      );
      CREATE INDEX audit_run ON audit_events (run_id, seq);
      CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_events
        BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;
      CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_events
        BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;

      CREATE TABLE approvals (
        id          TEXT PRIMARY KEY,
        run_id      TEXT NOT NULL,
        server_id   TEXT NOT NULL,
        tool        TEXT NOT NULL,
        tool_class  TEXT NOT NULL CHECK (tool_class IN ('write', 'execute')),
        args        TEXT NOT NULL CHECK (json_valid(args)),
        reason      TEXT NOT NULL,
        status      TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
        decided_by  TEXT CHECK (decided_by IS NULL OR decided_by = 'human'),
        created_at  TEXT NOT NULL,
        decided_at  TEXT
      );
      CREATE INDEX approvals_run ON approvals (run_id, status);
    `,
  },
  {
    // Owner decision 2026-10-14: every external tool call, reads included, waits for a human approval,
    // so an approval may now be for a 'read'. SQLite cannot alter a CHECK, so the table is rebuilt.
    version: 2,
    sql: `
      CREATE TABLE approvals_v2 (
        id          TEXT PRIMARY KEY,
        run_id      TEXT NOT NULL,
        server_id   TEXT NOT NULL,
        tool        TEXT NOT NULL,
        tool_class  TEXT NOT NULL CHECK (tool_class IN ('read', 'write', 'execute')),
        args        TEXT NOT NULL CHECK (json_valid(args)),
        reason      TEXT NOT NULL,
        status      TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
        decided_by  TEXT CHECK (decided_by IS NULL OR decided_by = 'human'),
        created_at  TEXT NOT NULL,
        decided_at  TEXT
      );
      INSERT INTO approvals_v2 SELECT id, run_id, server_id, tool, tool_class, args, reason, status, decided_by, created_at, decided_at FROM approvals;
      DROP TABLE approvals;
      ALTER TABLE approvals_v2 RENAME TO approvals;
      CREATE INDEX approvals_run ON approvals (run_id, status);
    `,
  },
]
export const LATEST_SCHEMA_VERSION = 2
