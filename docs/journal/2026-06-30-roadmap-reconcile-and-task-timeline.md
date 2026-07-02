# Session Log — Roadmap Reconcile + Task Timeline Panel

**Date:** 2026-06-30
**Repo:** `/Users/agentsmyth/workspaces/dev/cockpit`
**Branch:** `main`

## 1. Why this entry exists

The architecture docs under `docs/current/architecture/` (rollout plan, ownership plan,
repo-map, Build-1-2 prompt pack) **predate the recent commits** and still frame the
two-level task hierarchy rebuild as the dominant open thread. That work has since shipped.
This entry reconciles the roadmap against the actual code state so future sessions don't
re-plan finished work.

## 2. Roadmap reconciliation (docs vs. code, verified 2026-06-30)

**Shipped since the docs were written (docs still call these "open"):**
- Two-level hierarchy: `lib/task-hierarchy.ts`, `lib/task-lifecycle.ts`, `parent_task_id`
  in `lib/db/schema.ts`, `computeRollup`/`validateParent`. → Rollout Wave 2 / Repo Builds 1–4
  substantially DONE.
- Intake v1: `lib/intake-pipeline.ts` + `/api/intake`, `/api/intake/slack`,
  `/api/intake/review`. → Wave 3 / Build 5 substantially DONE.
- Calendar scaffolding: `/api/calendar/{push,live,sync}`. → Wave 4 partially scaffolded.
- Harness onboarding: `/api/whoami`, `/api/workspaces`, `/api/tasks/[id]/events`. → DONE
  (commits `107210d`, `b674269`).

**Genuinely still open (verified against code):**
1. **Agents & Operators page** (`OPS-V5-AGENTS-PAGE-SPEC.md`) — `/settings/agents` is still a
   plain `<table>`; no `/settings/agents/[id]` detail page; missing API routes
   `GET /api/operators/[id]/{tasks,activity,budget}` and `GET /api/crons?operatorId=`.
   (`GET/PATCH /api/operators/[id]` already exist.)
2. **Governance / reconciliation queues** (Rollout Wave E / Repo Build 7) — no reconcile or
   review-queue surface (only productivity metrics exist).
3. **Log filters gap** — `app/logs/logs-client.tsx` filters by workspace/status/model only;
   journal section 9 wanted harness / session ID / outcome / blocked-reason filters too.
4. **`cockpit-task` CLI wrapper** — lives in `~/workspaces/_shared/tools/` (outside this repo),
   still missing.

**Bigger / later:** Comms+CRM spine (Wave 5), full scheduling/daily-review loop (Wave 4 reslotting),
orchestration agents (Wave 6, gated behind Waves 1–5).

## 3. What was built this session

**Task timeline panel** in `components/task-dialog.tsx` (completes the structured-events work
that shipped the `/api/tasks/[id]/events` endpoint but had no UI consumer).

- New `TaskTimeline` component fetches `GET /api/tasks/[id]/events` for existing tasks and
  renders a read-only vertical timeline.
- Per-event: humanized event type, relative timestamp, `from → to` status transition,
  summary note, blocked reason (red), artifact URL (link), and an actor/model/session footer
  pulled from the event `metadata`.
- Family-based icon/color accents (blocked/failed → red, completed/verification → green,
  artifact → blue, created/assigned/started → blue, default → neutral).
- Null-safe: renders nothing on fetch error or when there are no events; only mounts for
  tasks with an id (not the create dialog).
- Placed in the dialog body after the Execution Footprint panel.

Verification: `npm run build` passes clean.

## 4. Suggested next steps

- Agents page rebuild (MVP = card grid + `[id]` detail page) is the clearest next self-contained build.
- Add harness/session/outcome filters to the logs client (small, high-value observability win).
