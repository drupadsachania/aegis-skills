-- Migration: Themis exposure-validation log table
-- Created: 2026-10-02

CREATE TABLE IF NOT EXISTS themis_exposure_log (
  id                   BIGSERIAL PRIMARY KEY,
  case_id              TEXT NOT NULL,           -- 'exp-' + SHA-256 prefix of sanitised input (never input content)
  cve                  TEXT,                    -- CVE id when supplied, else NULL
  workflow_state       TEXT NOT NULL,
  exposure_state       TEXT NOT NULL,
  exploitability_state TEXT NOT NULL,
  impact_state         TEXT NOT NULL,
  detection_state      TEXT NOT NULL,
  policy_decision      TEXT NOT NULL,
  risk_before          INT NOT NULL DEFAULT 0,
  risk_after           INT,                     -- NULL until a verified retest produces an after-score
  risk_proven          BOOLEAN NOT NULL DEFAULT FALSE,
  skill_slugs          TEXT[] NOT NULL DEFAULT '{}',
  duration_ms          INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS themis_exposure_log_case_id_idx ON themis_exposure_log (case_id);

COMMENT ON TABLE themis_exposure_log IS 'Metadata log for Themis exposure-validation cases. Contains only state/score metadata and a content-derived case hash — never input content, evidence text, or user-supplied strings.';
