-- Migration: Themis rate limiting table
-- Created: 2026-05-24

CREATE TABLE IF NOT EXISTS themis_rate_limits (
  ip       TEXT PRIMARY KEY,
  count    INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: auto-clean rows older than 5 minutes to prevent table bloat
-- (Supabase doesn't have native TTL; this can be done via a scheduled function)
-- For now, the application logic resets windows in-place on update.

COMMENT ON TABLE themis_rate_limits IS 'Per-IP rate limiting for the Themis orchestration endpoint. Window is 60 seconds, max 10 requests per window.';
