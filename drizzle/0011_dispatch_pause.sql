-- 0011: soft pause switch for the dispatch engine.
-- DB-backed so the prod dashboard (shared Neon) can stop the Mini's local
-- dispatch cycles without SSH. DISPATCH_ENABLED stays the per-host capability
-- gate; this is the operational kill-switch layered under it.
ALTER TABLE dispatch_state ADD COLUMN IF NOT EXISTS paused BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE dispatch_state ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE dispatch_state ADD COLUMN IF NOT EXISTS paused_by TEXT;
