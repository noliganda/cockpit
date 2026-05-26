# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Orientation (read these first)
1. `README.md` — repo map and lineage (Charlie Dashboard → Ops Dashboard → **Cockpit / OPS v5**)
2. `docs/INDEX.md` — docs navigation
3. `docs/current/architecture/OPS-V5-INTAKE-ROUTING-AND-EXECUTION-MODEL.md` — the product model
4. `docs/current/architecture/OPS-V5-ROLLOUT-PLAN-CHARLIE-DEVON-CLAUDE.md` — build sequencing
5. `.interface-design/system.md` — design tokens and UI patterns

`docs/current/` is the live source of truth. `docs/versions/v4-ops-dashboard/` and `docs/archive/` are historical reference only — do not let them drive current decisions.

**Project journal:** `docs/journal/` holds the ongoing ideation, briefs, and dated session-handoff logs for Cockpit (migrated in-repo from the old `~/workspaces/om/projects/cockpit/` folder, which no longer exists). Read the newest-dated file there for the latest context on what was recently worked on and what's next. The rest of `docs/` covers architecture; the journal covers recent intent and next steps.

> Note: journal files predate the move and still reference an external path / a different machine user (`/Users/agentsmyth/…`); treat those as historical and resolve paths against this repo.

## Commands
```bash
npm run dev          # Next.js dev server
npm run build        # Production build — run after every milestone; fix ALL errors
npm run lint         # ESLint (next lint)
npm run db:push      # Push schema/lib/db/schema.ts to Postgres via drizzle-kit (uses DATABASE_URL_UNPOOLED)
npm run db:studio    # Drizzle Studio
node scripts/query_db.mjs        # Ad-hoc DB inspection (scripts self-load .env.local)
node scripts/update_operators.mjs
```
There is **no test framework** in this repo — verification is `npm run build` plus manual checks. `.mjs` scripts read `.env.local` directly; API code reads `process.env`.

## Architecture

**Stack:** Next.js 15 App Router + React 19, TypeScript, Drizzle ORM on Neon serverless Postgres (`neon-http`), Tailwind v4, Radix primitives, BlockNote/Mantine (note editor), `recharts` (metrics), `openai` (embeddings + chat). Path alias `@/*` → repo root.

### The OPS v5 model (what the whole app is about)
> Channels are the intake. Cockpit is the operational truth. Specialist systems execute and store.

Requests enter via channels (Slack/email/form/manual) → get **classified and routed** → **registered as operational objects in Cockpit** → routed to execution/storage backends → reviewed/prioritised/scheduled. The value is turning real work into measurable outcomes. Read the intake-routing doc before changing intake, tasks, or logging.

### `activity_log` is the canonical event spine
`lib/activity.ts` `logActivity()` is the single write path. It carries both **legacy fields** (always populated) and **OPS v5 canonical fields** (`actorType`, `eventFamily`, `eventType`, `sourceSystem`, productivity/cost metrics, approval governance — all optional for backward compat). It also kicks off **async embedding generation** (never blocks the write) and **never throws** — logging failures must not break the main operation. When you add a meaningful operational action, log it here. Rule: *log the outcome, not the chat.*

### Tasks: hierarchy + lifecycle + audit
- **Two-level hierarchy only** (`lib/task-hierarchy.ts`): top-level **parent** (strategic prioritisation object) + **subtask** (execution object). No nesting beyond 2 levels — `validateParent`/`validateReparent` enforce this. Subtasks `inheritFromParent` (workspace/project/area/priority/tags). `computeRollup`/`applyParentRollup` derive a parent signal (`on_track`/`at_risk`/`blocked`/`ready_for_review`/`all_done`) and emit events — they do **not** auto-transition the parent.
- **Lifecycle** (`lib/task-lifecycle.ts`): UI uses legacy statuses (`Backlog`/`To Do`/`In Progress`/`Needs Review`/`Done`/`Cancelled`); these map to normalized statuses (`draft`/`queued`/`in_progress`/`blocked`/`awaiting_review`/`done`/`cancelled`). `isValidTransition`, `inferEventType`, and `inferTimestamps` derive event types and `startedAt`/`completedAt` side-effects from transitions.
- **Audit trail:** every task mutation writes a `task_events` row (structured per-task) **and** an `activity_log` event (cross-cutting). See `app/api/tasks/route.ts` for the canonical create flow.

### Operators & agent execution
`operators` is a first-class registry of humans **and** agents (stable slug ids like `oli`, `charlie`). Tasks carry ownership (`assigneeId`/`assigneeType`/`supervisorId`/`executionMode`) and ephemeral execution footprint (`executingModel`/`executingSessionId`). Agent execution (`lib/agent-execution.ts`): `agent_task_sessions` (one active/queued session per operator+task, unique-constrained) and `agent_wakeup_requests` (coalescing queue, claimed via heartbeat) drive agent runs; `operators` tracks monthly budget vs spend, `budget_policies` sets limits.

### Auth (no middleware — routes guard themselves)
`lib/auth.ts`. Browser uses an httpOnly cookie (`ops-session`) holding JSON `SessionData`. API/harness callers use `Authorization: Bearer <CRON_SECRET>`; harness provenance arrives via `x-harness-name`/`x-harness-model`/`x-harness-session-id` headers and is recorded as `actorType: 'agent'` with `executingModel`/`executingSessionId`. There is a separate scoped guest session (`ops-guest-session`, path-limited to `/metrics/korus`). Each route calls `getSession()` (presence check) or `getSessionData()` (role/identity); guests are 403'd from writes.

### API route conventions
Routes live in `app/api/**/route.ts`, validate input with `zod`, and return `NextResponse.json`. Wrap handlers with `apiHandler` (`lib/api-handler.ts`) for try/catch, or hand-roll the try/catch as the tasks route does. Heavy domain logic belongs in `lib/` (e.g. `lib/intake-pipeline.ts` is the single intake execution path; routes like `/api/intake`, `/api/intake/slack` are thin wrappers).

### Workspaces — mind the two id schemes
UI/`tasks.workspaceId` use **`byron-film` | `korus` | `personal`** (`types/index.ts` `WORKSPACES`). The `activity_log.entity` / `agent_actions.entity` column uses **`byron_film` | `korus` | `olivier_marcolin` | `shared`**. Don't conflate them. Per-workspace status options and area lists live in `types/index.ts` and `.interface-design/system.md`. Region is **KORUS-only**.

### Other subsystems
- **Priority engine** (`lib/priority-engine.ts`): deterministic Eisenhower + project-tier scoring (P1–P8) used by `/tasks/priority` and `/tasks/matrix`.
- **Search/embeddings** (`lib/search.ts`, `lib/embeddings.ts`): hybrid full-text (`tsvector` ILIKE) + pgvector semantic (1536-dim, OpenAI). Embeddings written async; nightly `vercel.json` cron `/api/cron/embed-backfill` fills gaps. Custom `vector`/`tsvector` Drizzle column types in `lib/db/schema.ts`.
- **Integrations:** Notion sync (`lib/notion-sync.ts`, gated by `NOTION_SYNC_ENABLED`), Slack intake (`lib/slack-intake.ts` + thread inference), Google Calendar (`/api/calendar/*`), Obsidian export, and the OpenClaw gateway powering the Charlie chat sidebar (`OPENCLAW_GATEWAY_URL`/`_TOKEN`).
- **Native tables/bases:** `user_bases`/`user_tables`/`user_columns`/`user_rows` back the Airtable-style spreadsheet feature under `/bases`.

### Database migrations
Numbered SQL files in `drizzle/` (`0000`–`0007`) are the canonical OPS v5 migration history. Day-to-day schema changes flow through editing `lib/db/schema.ts` then `npm run db:push`. `db:push` uses `DATABASE_URL_UNPOOLED`; the running app uses the pooled `DATABASE_URL`.

## Key design rules (from `.interface-design/system.md`)
- Sidebar background = canvas background (`#0F0F0F`) — not a different color
- Borders use `rgba(255,255,255,0.06)`; **borders-only depth, no shadows**
- Text is `#F5F5F5`, never pure white
- `font-sans` on the body; Geist Mono only for data/stats/IDs
- Workspace identity through accent color (Byron Film gold, KORUS teal, Personal orange)

## After each milestone
1. `npm run build` — fix ALL errors before moving on
2. Write status to `/tmp/cockpit-status.txt`
3. `git add -A && git commit -m '<descriptive message>'` (commit only when the work is sound)

When finished, write `MILESTONE_COMPLETE` to `/tmp/cockpit-status.txt` and summarise what changed, what is now true, and what remains.
