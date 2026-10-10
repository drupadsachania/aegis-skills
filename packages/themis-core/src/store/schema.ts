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
]
export const LATEST_SCHEMA_VERSION = 1
