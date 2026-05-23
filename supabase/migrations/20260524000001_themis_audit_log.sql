-- Migration: Themis audit log table
-- Created: 2026-05-24

CREATE TABLE IF NOT EXISTS themis_audit_log (
  id               BIGSERIAL PRIMARY KEY,
  task_hash        TEXT NOT NULL,           -- SHA-256 of sanitised task (never task content)
  skill_slugs      TEXT[] NOT NULL,
  total_input_tokens  INT NOT NULL DEFAULT 0,
  total_output_tokens INT NOT NULL DEFAULT 0,
  duration_ms      INT NOT NULL DEFAULT 0,
  guardrail_passed INT NOT NULL DEFAULT 0,
  guardrail_flagged INT NOT NULL DEFAULT 0,
  guardrail_blocked INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE themis_audit_log IS 'Audit log for Themis orchestration requests. Contains only metadata — no task content, findings, or user-supplied strings.';
