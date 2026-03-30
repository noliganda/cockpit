-- OPS v5 — Task Hierarchy: parent/subtask relationships
-- Date: 2026-03-30
-- All new columns are nullable or defaulted for backward compatibility.

-- ── 1. Add hierarchy fields to tasks ────────────────────────────────────────

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "parent_task_id" uuid;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "subtask_order" integer DEFAULT 0;

-- ── 2. Index for parent-child queries ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS "tasks_parent_task_id_idx" ON "tasks" ("parent_task_id");
