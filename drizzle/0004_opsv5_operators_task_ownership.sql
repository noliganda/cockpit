-- OPS v5 — Build 1+2: Operators model, task ownership/provenance/lifecycle, task events
-- Date: 2026-03-29
-- All new columns are nullable or have defaults for backward compatibility.

-- ── 1. Operators table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "operators" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "operator_type" text NOT NULL DEFAULT 'human',
  "role" text,
  "status" text NOT NULL DEFAULT 'active',
  "default_supervisor_id" text,
  "workspace_scope" text[] DEFAULT '{}',
  "capabilities" text[] DEFAULT '{}',
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ── 2. Seed initial operators ───────────────────────────────────────────────

INSERT INTO "operators" ("id", "name", "operator_type", "role", "status", "default_supervisor_id", "capabilities") VALUES
  ('oli', 'Oli', 'human', 'Principal — strategic direction, approval', 'active', NULL, '{}'),
  ('charlie', 'Charlie', 'agent', 'Chief of Staff — orchestration, comms, review, routing', 'active', 'oli', '{"orchestration","comms","review","routing","reporting"}'),
  ('devon', 'Devon', 'agent', 'Engineering — code, infrastructure, dashboard', 'active', 'charlie', '{"engineering","code","infrastructure"}'),
  ('finn', 'Finn', 'agent', 'Finance — invoicing, cost tracking, reporting', 'active', 'charlie', '{"finance","invoicing","reporting"}'),
  ('hunter', 'Hunter', 'agent', 'Business Development — outreach, pipeline', 'active', 'charlie', '{"business_development","outreach","pipeline"}'),
  ('scout', 'Scout', 'agent', 'Research — market intel, competitor analysis', 'active', 'charlie', '{"research","analysis","intelligence"}')
ON CONFLICT ("id") DO NOTHING;

-- ── 3. Extend tasks table — ownership fields ────────────────────────────────

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignee_type" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignee_id" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignee_name" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "supervisor_id" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "supervisor_name" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "execution_mode" text;

-- ── 4. Extend tasks table — provenance fields ──────────────────────────────

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source_type" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source_channel" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source_message_id" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source_created_at" timestamp with time zone;

-- ── 5. Extend tasks table — lifecycle fields ────────────────────────────────

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "object_type" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "blocked_reason" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "next_review_at" timestamp with time zone;

-- ── 6. Extend tasks table — review fields ───────────────────────────────────

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "review_required" boolean DEFAULT false;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reviewed_by" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completion_summary" text;

-- ── 7. Extend tasks table — artifact fields ─────────────────────────────────

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "artifact_url" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "artifact_type" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "artifact_status" text;

-- ── 8. New indexes on tasks ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "tasks_assignee_id_idx" ON "tasks" ("assignee_id");
CREATE INDEX IF NOT EXISTS "tasks_object_type_idx" ON "tasks" ("object_type");

-- ── 9. Task events table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "task_events" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "task_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "from_status" text,
  "to_status" text,
  "actor_type" text,
  "actor_id" text,
  "actor_name" text,
  "summary_note" text,
  "blocked_reason" text,
  "artifact_url" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "task_events_task_idx" ON "task_events" ("task_id");
CREATE INDEX IF NOT EXISTS "task_events_type_idx" ON "task_events" ("event_type");
CREATE INDEX IF NOT EXISTS "task_events_created_idx" ON "task_events" ("created_at");
