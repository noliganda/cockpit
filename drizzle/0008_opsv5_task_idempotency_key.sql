-- OPS v5 — idempotent task creation
-- Adds a client-supplied idempotency key so a retried POST /api/tasks returns
-- the existing task instead of creating a duplicate.
-- Safe to run repeatedly. Apply with `npm run db:push` or by running this file.

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
CREATE INDEX IF NOT EXISTS "tasks_idempotency_key_idx" ON "tasks" ("idempotency_key");
