-- OPS v5 — Build 4: Agent wakeup request queue
-- Date: 2026-03-30
-- Add table for wakeup requests and session context snapshot

-- 1. Create agent_wakeup_requests table
CREATE TABLE IF NOT EXISTS "agent_wakeup_requests" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "operator_id" text NOT NULL,
  "task_id" uuid,
  "source" text NOT NULL,
  "trigger_detail" text,
  "reason" text,
  "payload" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'queued',
  "coalesced_count" integer NOT NULL DEFAULT 0,
  "idempotency_key" text,
  "requested_by_actor_type" text,
  "requested_by_actor_id" text,
  "run_id" uuid,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "claimed_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "agent_wakeup_requests_operator_status_idx" ON "agent_wakeup_requests" ("operator_id", "status");
CREATE INDEX IF NOT EXISTS "agent_wakeup_requests_task_status_idx" ON "agent_wakeup_requests" ("task_id", "status");

-- 2. Add context_snapshot to agent_task_sessions
ALTER TABLE "agent_task_sessions"
ADD COLUMN IF NOT EXISTS "context_snapshot" jsonb;
