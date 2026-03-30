-- OPS v5 — Build 3: Agent execution model (budget tracking, task checkout, budget policies)
-- Date: 2026-03-30
-- All new columns and tables are idempotent for backward compatibility.

-- 1. Extend operators table
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "budget_monthly_cents" integer NOT NULL DEFAULT 0;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "spent_monthly_cents" integer NOT NULL DEFAULT 0;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "last_heartbeat_at" timestamp with time zone;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "paused_at" timestamp with time zone;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "pause_reason" text;

-- 2. Create agent_task_sessions table
CREATE TABLE IF NOT EXISTS "agent_task_sessions" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "operator_id" text NOT NULL,
  "task_id" uuid NOT NULL,
  "session_display_id" text,
  "adapter_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "last_checkpoint_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_error" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "agent_task_sessions_operator_task_uniq" ON "agent_task_sessions" ("operator_id", "task_id");

-- 3. Create budget_policies table
CREATE TABLE IF NOT EXISTS "budget_policies" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "scope_type" text NOT NULL,
  "scope_id" text NOT NULL,
  "window_kind" text NOT NULL DEFAULT 'monthly',
  "amount_cents" integer NOT NULL DEFAULT 0,
  "warn_percent" integer NOT NULL DEFAULT 80,
  "hard_stop_enabled" boolean NOT NULL DEFAULT true,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Seed operator default budgets
UPDATE "operators" SET "budget_monthly_cents" = 50000 WHERE "id" = 'oli';
UPDATE "operators" SET "budget_monthly_cents" = 20000 WHERE "id" = 'charlie';
UPDATE "operators" SET "budget_monthly_cents" = 10000 WHERE "id" = 'devon';
UPDATE "operators" SET "budget_monthly_cents" = 10000 WHERE "id" = 'finn';
UPDATE "operators" SET "budget_monthly_cents" = 10000 WHERE "id" = 'hunter';
UPDATE "operators" SET "budget_monthly_cents" = 5000 WHERE "id" = 'scout';
UPDATE "operators" SET "budget_monthly_cents" = 5000 WHERE "id" = 'marcus';
