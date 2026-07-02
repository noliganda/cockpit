-- OPS v5 — Dispatch engine, Phase 2: operator dispatch config + cycle watermark
-- Extends operators so the engine knows HOW to spawn each one (adapter + params +
-- concurrency), and adds the single-row dispatch_state table that stores the
-- cascade watermark (§6.1: catch completions that bypassed the API PATCH path).
-- See docs/current/architecture/COCKPIT-DISPATCH-ENGINE-SPEC.md §4.2.
-- Idempotent / safe to run repeatedly. Apply with `npm run db:push` or run this file.

ALTER TABLE operators ADD COLUMN IF NOT EXISTS adapter_type TEXT;
-- 'hermes-oneshot' (Phase 2) | 'hermes-delegate' | 'hermes-tmux' | 'claude-tmux' (Phase 3)
ALTER TABLE operators ADD COLUMN IF NOT EXISTS dispatch_config JSONB NOT NULL DEFAULT '{}';
-- adapter-specific params: tmux session name, workdir, model, toolsets, command override, etc.
ALTER TABLE operators ADD COLUMN IF NOT EXISTS max_concurrent INTEGER NOT NULL DEFAULT 1;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS active_run_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS dispatch_state (
  id TEXT PRIMARY KEY,
  last_cascade_at TIMESTAMPTZ,
  last_cycle_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO dispatch_state (id) VALUES ('singleton') ON CONFLICT (id) DO NOTHING;
