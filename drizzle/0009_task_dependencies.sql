-- OPS v5 — Dispatch engine, Phase 1: task dependency graph
-- Adds the task_dependencies table — a real dependency graph distinct from the
-- parent/child hierarchy (hierarchy is grouping; dependencies are ordering).
-- A dependent task can't be dispatched until its prerequisites are satisfied.
-- See docs/current/architecture/COCKPIT-DISPATCH-ENGINE-SPEC.md §4.1.
-- Idempotent / safe to run repeatedly. Apply with `npm run db:push` or run this file.

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prerequisite_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'blocks',  -- blocks | needs_artifact | needs_review
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS task_dependencies_uniq
  ON task_dependencies (prerequisite_task_id, dependent_task_id);
CREATE INDEX IF NOT EXISTS task_dependencies_dependent_idx
  ON task_dependencies (dependent_task_id);
CREATE INDEX IF NOT EXISTS task_dependencies_prereq_idx
  ON task_dependencies (prerequisite_task_id);
