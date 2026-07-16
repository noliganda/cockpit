# Cockpit Dispatch Engine — Spec

**Date:** 2026-06-30
**Status:** Draft — for review before implementation
**Author:** PM/orchestrator session (Hermes)
**Related:** `OPS-V5-INTAKE-ROUTING-AND-EXECUTION-MODEL.md`, `lib/agent-execution.ts`, `docs/journal/2026-06-30-roadmap-reconcile-and-task-timeline.md`

> Pulls Wave 6 (orchestration agents) forward. The infrastructure is ~60% built
> (session tracking, wakeup queue, budget policies, operators). What's missing is
> the engine that actually claims tasks, spawns harnesses, and cascades
> dependencies. This spec completes that layer without reinventing what exists.

---

## 1. Problem

Cockpit is a passive system of record. Tasks get created, assigned, and updated —
but nothing automatically picks up a ready task and executes it. Every dispatch is
manual: Oli (or the PM session) reads Cockpit, decides what's ready, and manually
steers a harness. There is no:

- **Dispatcher** — nothing claims queued `agent_wakeup_requests` and spawns a harness.
- **Dependency cascade** — no `task_dependencies` table; "A done → B unblocks" is
  impossible. Only parent/child hierarchy exists, which is grouping, not dependency.
- **Readiness check** — nothing evaluates "is this task ready?" (assigned + deps met
  + not blocked + budget available).
- **Harness adapters** — no code translates a claimed task into "spawn Hermes" or
  "steer Claude Code via tmux." Only 2 operators exist (oli, hermes); Claude Code
  and Codex aren't registered.

The result: Cockpit drifts from reality (tasks stale "In Progress" for weeks), and
the PM session can't cascade dependent work — it has to manually re-check after each
completion.

---

## 2. Goals & Non-Goals

**Goals:**
1. A task with met dependencies and an assigned agent operator auto-dispatches.
2. When a task completes, its dependents are evaluated and promoted if ready.
3. Multiple harness types (Hermes, Claude Code) participate via a pluggable adapter.
4. Full observability — every dispatch, claim, stale-reclaim, and cascade is logged
   to `activity_log` and visible as `task_events`.
5. Budget enforcement — an operator over budget is paused, not dispatched.
6. Single source of truth stays Cockpit. No second board (Kanban or otherwise).

**Non-goals (this phase):**
- AI-powered task classification / auto-assignment (separate, Task 3 in CODEX-TASK-QUEUE).
- Cross-machine process orchestration (the dispatcher runs on the Mini; adapters steer
  local tmux / spawn local processes only).
- Per-harness scoped API tokens (still the shared bearer; orthogonal to this spec).
- UI for the dispatch queue (API + logs first; UI is a later milestone).

---

## 3. Architecture Overview

```
                        ┌─────────────────────────────────┐
                        │   /api/cron/dispatch (poller)    │
                        │   runs every 2 min via vercel.json│
                        └──────────────┬──────────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │  lib/dispatch/engine.ts  │
                          │  (claim → spawn → track) │
                          └────────────┬────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
          ┌─────────────────┐ ┌──────────────┐ ┌────────────────┐
          │ readiness.ts    │ │ adapters/    │ │ cascade.ts     │
          │ (deps met?      │ │ hermes.ts    │ │ (on Done,      │
          │  budget? not    │ │ claude.ts    │ │  unblock deps) │
          │  blocked?)      │ │ one-shot.ts  │ │                │
          └─────────────────┘ └──────────────┘ └────────────────┘
```

The poller calls `engine.runDispatchCycle()`. The engine:
1. Finds all tasks in a "ready" state (assigned agent + deps met + not blocked + budget OK).
2. For each, claims the corresponding `agent_wakeup_request` (atomic UPDATE...WHERE
   status='queued' RETURNING — prevents double-claim).
3. Invokes the operator's adapter to spawn/steer the harness.
4. On task completion (detected via existing `markSessionComplete` or a heartbeat
   poll), `cascade.ts` evaluates dependents and creates new wakeup requests for
   newly-ready tasks.

---

## 4. Schema Changes

### 4.1 New table: `task_dependencies`

The parent/child hierarchy is grouping, not dependency. We need a real dependency graph.

```sql
-- drizzle/0009_task_dependencies.sql
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prerequisite_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'blocks',  -- blocks | needs_artifact | needs_review
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS task_dependencies_uniq
  ON task_dependencies (prerequisite_task_id, dependent_task_id);
CREATE INDEX IF NOT EXISTS task_dependencies_dependent_idx
  ON task_dependencies (dependent_task_id);
CREATE INDEX IF NOT EXISTS task_dependencies_prereq_idx
  ON task_dependencies (prerequisite_task_id);
```

Drizzle schema (`lib/db/schema.ts`):
```typescript
export const taskDependencies = pgTable('task_dependencies', {
  id: uuid('id').defaultRandom().primaryKey(),
  prerequisiteTaskId: uuid('prerequisite_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  dependentTaskId: uuid('dependent_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  dependencyType: text('dependency_type').notNull().default('blocks'),
  ...timestamps,
}, (t) => [
  unique('task_dependencies_uniq').on(t.prerequisiteTaskId, t.dependentTaskId),
  index('task_dependencies_dependent_idx').on(t.dependentTaskId),
  index('task_dependencies_prereq_idx').on(t.prerequisiteTaskId),
])
```

**Dependency types:**
- `blocks` — dependent can't start until prerequisite is Done.
- `needs_artifact` — dependent needs the prerequisite's `artifactUrl` as input.
- `needs_review` — dependent needs the prerequisite to be reviewed (not just Done).

### 4.2 Extend `operators` table

Add adapter + dispatch config so the engine knows HOW to spawn each operator.

```sql
-- drizzle/0010_operator_dispatch_config.sql
ALTER TABLE operators ADD COLUMN IF NOT EXISTS adapter_type TEXT;  -- 'hermes-delegate' | 'hermes-tmux' | 'claude-tmux' | 'hermes-oneshot' | 'herdr' (added 2026-07-09)
ALTER TABLE operators ADD COLUMN IF NOT EXISTS dispatch_config JSONB NOT NULL DEFAULT '{}';
-- dispatch_config holds adapter-specific params: tmux session name, workdir, model, toolsets, etc.
ALTER TABLE operators ADD COLUMN IF NOT EXISTS max_concurrent INTEGER NOT NULL DEFAULT 1;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS active_run_count INTEGER NOT NULL DEFAULT 0;
```

### 4.3 Seed new operators

```sql
-- Register Claude Code as an operator (it's already doing work, just not registered)
INSERT INTO operators (id, name, operator_type, role, status, adapter_type, dispatch_config, max_concurrent)
VALUES ('claude-code', 'Claude Code', 'agent', 'coder', 'active', 'claude-tmux',
        '{"tmux_session": "cockpit", "workdir": "/Users/agentsmyth/workspaces/dev/cockpit"}', 1)
ON CONFLICT (id) DO NOTHING;

-- Extend hermes operator with dispatch config
UPDATE operators SET adapter_type = 'hermes-delegate',
  dispatch_config = '{"model": "glm-5.2", "toolsets": ["terminal","file","web"]}',
  max_concurrent = 3
WHERE id = 'hermes';
```

---

## 5. Core Modules

### 5.1 `lib/dispatch/readiness.ts`

Evaluates whether a task is ready to dispatch. Pure function, no side effects.

```typescript
export interface ReadinessResult {
  ready: boolean
  blockers: string[]  // human-readable reasons if not ready
}

export async function evaluateReadiness(taskId: string): Promise<ReadinessResult> {
  // 1. Task must have assigneeType 'agent' or 'function' with a valid assigneeId
  // 2. Task status must be 'To Do' or 'Backlog' (not In Progress, Done, Blocked)
  // 3. All task_dependencies where this is the dependent must have
  //    prerequisite status = 'Done' (or 'Needs Review' for needs_review type)
  //    AND for needs_artifact, prerequisite.artifactUrl must be non-null
  // 4. Operator must be active, not paused, not over budget
  // 5. Operator active_run_count < max_concurrent
  // 6. No existing active agent_task_session for this task
}
```

### 5.2 `lib/dispatch/engine.ts`

The main dispatch cycle. Called by the cron poller.

```typescript
export async function runDispatchCycle(): Promise<DispatchSummary> {
  // 1. Reclaim stale claims: wakeup_requests with status='claimed' or 'running'
  //    where claimedAt < now - STALE_THRESHOLD (default 15 min) → reset to 'queued'
  // 2. Find candidate tasks: status in ('To Do','Backlog'), assigneeType in ('agent','function')
  // 3. For each candidate, evaluateReadiness(). Collect ready tasks.
  // 4. Sort ready tasks by priority (use existing lib/priority-engine.ts scoring)
  // 5. For each ready task (respecting per-operator max_concurrent):
  //    a. Atomic claim: UPDATE agent_wakeup_requests SET status='claimed', claimedAt=now()
  //       WHERE id=? AND status='queued' RETURNING *  (prevents double-dispatch)
  //    b. Create agent_task_session (status='active')
  //    c. Increment operator.active_run_count
  //    d. Invoke adapter.dispatch(task, operator, wakeupRequest)
  //    e. Log to activity_log + task_events
  // 6. Return summary: {claimed: N, dispatched: N, reclaimed: N, errors: [...]}
}
```

**Stale claim threshold:** configurable, default 15 min. A claimed/running request
older than this is considered dead (crashed harness, lost tmux session) and reset.

### 5.3 `lib/dispatch/adapters/`

Pluggable harness adapters. Each implements:

```typescript
export interface HarnessAdapter {
  type: string
  dispatch(task: Task, operator: Operator, wakeup: WakeupRequest): Promise<DispatchResult>
}

export interface DispatchResult {
  sessionId: string       // the harness's own session/run ID
  status: 'spawned' | 'steered' | 'failed'
  detail: string
}
```

**`hermes-delegate.ts`** — spawns a Hermes subagent via `delegate_task` (or
equivalent one-shot `hermes chat -q`). Best for clean, isolated, bounded tasks.
The adapter writes the task context + cockpit-wiring instructions into the prompt.

**`hermes-tmux.ts`** — sends a message into an existing Hermes tmux session via
`tmux send-keys`. Best for continuation of a live session that already has context.
Fragile (prompt_toolkit TUI); logged as `dispatch_method: 'tmux-steer'`.

**`claude-tmux.ts`** — sends a message into a Claude Code tmux session. Same
fragility caveat. Uses the cockpit-wiring prompt template (section 8 of
cockpit-wiring.md) so Claude Code self-registers.

**`hermes-oneshot.ts`** — `hermes chat -q "<prompt>"` fire-and-forget. Best for
short research/lookup tasks. No session continuity.

**`herdr.ts`** (+ `herdr-common.ts`, added 2026-07-09) — steers an agent pane via
herdr's socket-API CLI; named by transport, not agent (herdr detects the harness
per pane, so one adapter covers any harness). Upgrades over the tmux adapters:
idle precondition (refuses to steer a busy agent — doubles as a recursive-steer
guard), literal `agent send` + separate Enter (no `[Pasted text]` fragility), and
submission *confirmed* via agent-status + task-id read-back. Gates on submission,
not completion (fire-and-forget contract preserved). `dispatch_config` targets a
herdr pane/agent instead of a tmux session. Journal:
`docs/journal/2026-07-09-herdr-dispatch-adapter.md`.

**Adapter selection:** `operator.adapterType` field determines which adapter.
Future: a task could override (`task.metadata.preferredAdapter`).

### 5.4 `lib/dispatch/cascade.ts`

Dependency cascade — the key feature Oli asked for.

```typescript
export async function cascadeOnCompletion(taskId: string): Promise<CascadeResult> {
  // Called when a task transitions to Done.
  // 1. Find all task_dependencies where prerequisite_task_id = taskId
  // 2. For each dependent:
  //    a. Re-evaluate readiness (its other deps might still be unmet)
  //    b. If now ready: create agent_wakeup_request (source='dependency_cascade')
  //    c. Log task_event on the dependent: "unblocked by completion of <taskId>"
  //    d. Log activity_log: dependency_cascade event
  // 3. Return {unblocked: N, promoted: N, stillBlocked: N}
}
```

This hooks into the existing task-completion path. In `app/api/tasks/[id]/route.ts`
PATCH handler, when status transitions to Done, call `cascadeOnCompletion()` after
the existing `applyParentRollup` call.

**Also cascade on un-block:** if a Blocked task's `blockedReason` is cleared and
status returns to 'To Do', evaluate its dependents' readiness too (a dep may have
been waiting on this task being unblocked, not just Done).

---

## 6. API Surface

### 6.1 Cron poller

```typescript
// app/api/cron/dispatch/route.ts
// GET /api/cron/dispatch  (called by vercel.json cron every 2 min)
// Auth: CRON_SECRET bearer (same as other cron routes)
// Calls engine.runDispatchCycle(), returns summary.
// Also calls cascadeOnCompletion for any tasks that completed since last cycle
// (detected via tasks.completedAt > last_dispatch_cascade_at watermark).
```

Add to `vercel.json`:
```json
{ "path": "/api/cron/dispatch", "schedule": "*/2 * * * *" }
```

### 6.2 Manual dispatch trigger

```typescript
// POST /api/tasks/[id]/dispatch
// Manually trigger dispatch for a specific task (bypasses readiness check with
// a ?force=true, but still logs). Used by the PM session or dashboard.
```

### 6.3 Dependency management

```typescript
// POST /api/tasks/[id]/dependencies  — add a dependency
//   body: { prerequisiteTaskId, dependencyType }
// DELETE /api/tasks/[id]/dependencies/[prereqId]  — remove
// GET /api/tasks/[id]/dependencies  — list (incoming + outgoing)
```

### 6.4 Dispatch status

```typescript
// GET /api/dispatch/status  — current cycle summary, stale claims, active runs
//   (for the PM session / dashboard to monitor)
```

---

## 7. Integration with Existing Code

| Existing | How the engine uses it |
|----------|----------------------|
| `lib/agent-execution.ts` | Engine calls `createTaskSession`, `markSessionActive`. Adapters call `markSessionComplete`/`markSessionFailed` when the harness finishes. |
| `agent_wakeup_requests` | Engine claims via atomic UPDATE. Adapters create wakeup requests (source='task_assigned') when a task is assigned to an agent operator. |
| `lib/priority-engine.ts` | Engine sorts ready tasks by priority score before dispatch. |
| `lib/task-lifecycle.ts` | `cascadeOnCompletion` hooks into the Done transition. Existing `inferEventType`/`inferTimestamps` still drive event logging. |
| `lib/activity.ts` `logActivity()` | Every claim, dispatch, stale-reclaim, and cascade logs here. `eventFamily: 'agent'`, `eventType: 'task_dispatched'` / `'task_claim_stale_reclaimed'` / `'dependency_cascade'`. |
| `operators.budgetMonthlyCents` / `spentMonthlyCents` | Readiness check enforces budget. Over-budget → operator auto-paused. |
| `cockpit-wiring.md` protocol | Adapters embed the cockpit-wiring prompt (section 8) so spawned harnesses self-register their model/session. |

---

## 8. Implementation Phases

### Phase 1 — Dependency graph (no dispatch yet)
- Add `task_dependencies` table + schema + migration 0009.
- Add dependency API routes (POST/DELETE/GET).
- Add `evaluateReadiness()` in readiness.ts (read-only, no dispatch).
- Wire `cascadeOnCompletion()` to the Done transition — but it only creates wakeup
  requests, nothing claims them yet.
- **Verification:** manually create deps, mark a prereq Done, confirm dependent gets
  a wakeup request + task_event. `npm run build` passes.

### Phase 2 — Dispatcher + Hermes adapter
- Add `lib/dispatch/engine.ts` with `runDispatchCycle()`.
- Add `/api/cron/dispatch` route + vercel.json cron entry.
- Implement `hermes-oneshot.ts` adapter (simplest — fire-and-forget).
- Extend `operators` with adapter_type + dispatch_config + max_concurrent (migration 0010).
- Seed claude-code + configure hermes operators.
- **Verification:** create a ready task assigned to hermes, confirm the cron cycle
  dispatches it via `hermes chat -q`, the harness self-registers in Cockpit, and
  completion cascades to a dependent.

### Phase 3 — Claude Code adapter + tmux steering
- Implement `claude-tmux.ts` and `hermes-tmux.ts` adapters.
- Implement `hermes-delegate.ts` (subagent spawn).
- Add stale-claim reclamation + `/api/dispatch/status` monitoring route.
- Add `POST /api/tasks/[id]/dispatch` manual trigger.
- **Verification:** dispatch a task to Claude Code in the cockpit tmux session,
  confirm it picks up the task, self-registers, and completes.

### Phase 4 — Hardening
- Budget enforcement + auto-pause on over-budget.
- `needs_artifact` dependency type: inject prerequisite's artifactUrl into the
  dependent's dispatch prompt.
- Concurrency limits per operator.
- Dashboard panel for dispatch queue (stretch — API-first until then).

---

## 9. Security & Safety

- **Cron route auth:** `/api/cron/dispatch` uses `CRON_SECRET` bearer (same as
  existing cron routes). No guest access.
- **No secrets in logs:** adapters pass workspace context, never secrets. The
  cockpit-wiring prompt uses env var names, not values.
- **Adapter command safety:** tmux adapters use `send-keys` with escaped text only.
  No shell interpolation. `hermes chat -q` prompts are single-quoted.
- **Budget guard:** an operator over budget is paused (status='paused',
  pauseReason='budget_exceeded') by the readiness check, not dispatched. Oli gets
  a task_event notification.
- **Stale claim safety:** reclaimed claims log a `task_claim_stale_reclaimed` event
  so there's a trail if a harness crashed mid-task.

---

## 10. Open Questions for Oli

1. **Cron frequency:** every 2 min is responsive but adds load. 5 min? Or event-driven
   (dispatch immediately on task assignment / dependency completion) with cron as a
   safety-net reclaimer only?
2. **Default adapter per task type:** should research tasks default to
   `hermes-oneshot`, coding tasks to `claude-tmux`, bookkeeping to `hermes-delegate`?
   Or always let the operator's adapterType decide?
3. **Stale threshold:** 15 min default for reclaiming dead claims. Too aggressive for
   long Claude Code sessions? Should it be per-adapter (tmux = 30 min, oneshot = 5 min)?
4. **Should the PM session (this one) be an operator?** If yes, it'd be `hermes-tmux`
   adapter steering THIS tmux session — but that's recursive (the PM dispatching to
   itself). Probably the PM session should remain manual-only and dispatch TO other
   operators, not be dispatched to.
5. **Cascade on Failed tasks:** if a prerequisite fails (not just completes), should
   dependents be auto-blocked with reason "prerequisite failed"? Currently spec only
   cascades on Done.

---

## 11. What NOT to Build

- A second board (Kanban sync). Cockpit is the single source of truth.
- AI auto-assignment / classification. That's CODEX-TASK-QUEUE Task 3, separate.
- Cross-machine dispatch. Adapters steer local tmux / spawn local processes on the
  Mini only. The Studio and laptop are thin clients that attach to Mini tmux.
- A complex workflow engine (branching, parallel forks, etc.). Linear dependency
  chains only. The two-level task hierarchy (parent/child) handles grouping;
  dependencies handle ordering. Don't conflate them.
