-- 0012: comm_items — message digest feed published by the Email PA (spec:
-- docs/current/architecture/COCKPIT-MESSAGES-SECTION-SPEC.md §3). Additive only.
-- Previews only, never raw message bodies. (source, external_id) unique is the
-- idempotency anchor for bulk upserts.
CREATE TABLE IF NOT EXISTS "comm_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source" text NOT NULL,
  "workspace_id" text NOT NULL,
  "external_id" text NOT NULL,
  "sender" text NOT NULL,
  "subject" text NOT NULL,
  "preview" text NOT NULL,
  "classification" text NOT NULL,
  "action_taken" text DEFAULT 'none' NOT NULL,
  "draft_id" text,
  "draft_status" text,
  "urgency" text DEFAULT 'digest' NOT NULL,
  "message_ts" timestamp with time zone NOT NULL,
  "run_id" text NOT NULL,
  "linked_task_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "comm_items_source_external_uq" UNIQUE("source","external_id")
);
ALTER TABLE "comm_items" ADD CONSTRAINT "comm_items_linked_task_id_tasks_id_fk"
  FOREIGN KEY ("linked_task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "comm_items_message_ts_idx" ON "comm_items" ("message_ts");
CREATE INDEX IF NOT EXISTS "comm_items_workspace_idx" ON "comm_items" ("workspace_id");
CREATE INDEX IF NOT EXISTS "comm_items_draft_status_idx" ON "comm_items" ("draft_status");
CREATE INDEX IF NOT EXISTS "comm_items_run_idx" ON "comm_items" ("run_id");
