-- OPS v5 Phase 1: Extend activity_log into the canonical operational event log
-- All columns are nullable or have safe defaults — fully backward compatible
-- Existing rows and writers continue to work unchanged

-- ── Actor fields ────────────────────────────────────────────────────────────
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'human';
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS actor_id TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS agent_id TEXT;

-- ── Event typing ────────────────────────────────────────────────────────────
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS event_family TEXT NOT NULL DEFAULT 'system';
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'success';

-- ── Source / provenance ─────────────────────────────────────────────────────
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS source_system TEXT NOT NULL DEFAULT 'dashboard';
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS workflow_run_id TEXT;

-- ── Approval / governance ───────────────────────────────────────────────────
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- ── Productivity fields ─────────────────────────────────────────────────────
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS duration_minutes REAL;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS estimated_manual_minutes REAL;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS human_intervention BOOLEAN DEFAULT false;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS intervention_type TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS api_cost_usd REAL DEFAULT 0;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS api_tokens_used INTEGER DEFAULT 0;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS api_model TEXT;

-- ── Artifact fields ─────────────────────────────────────────────────────────
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS artifact_count INTEGER DEFAULT 0;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS artifact_types TEXT[] DEFAULT '{}';

-- ── Indexes for new fields ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS activity_actor_type_idx ON activity_log(actor_type);
CREATE INDEX IF NOT EXISTS activity_agent_id_idx ON activity_log(agent_id);
CREATE INDEX IF NOT EXISTS activity_event_family_idx ON activity_log(event_family);
CREATE INDEX IF NOT EXISTS activity_event_type_idx ON activity_log(event_type);
CREATE INDEX IF NOT EXISTS activity_category_idx ON activity_log(category);
CREATE INDEX IF NOT EXISTS activity_status_idx ON activity_log(status);
CREATE INDEX IF NOT EXISTS activity_source_system_idx ON activity_log(source_system);
CREATE INDEX IF NOT EXISTS activity_approval_status_idx ON activity_log(approval_status);
