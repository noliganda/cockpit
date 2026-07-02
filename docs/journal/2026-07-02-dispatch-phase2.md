# Session Log — Dispatch Engine Phase 2 (dispatcher + hermes-oneshot)

**Date:** 2026-07-02
**Repo:** `/Users/agentsmyth/workspaces/dev/cockpit`
**Branch:** `main`
**Spec:** `docs/current/architecture/COCKPIT-DISPATCH-ENGINE-SPEC.md` §8 Phase 2
**Precedes:** Phase 1 landed same day (see `2026-07-02-sequential-merge-cleanup.md` §5 — migration 0009 applied + cascade verified before this session started).

## 1. What landed

- **`lib/dispatch/engine.ts`** — `runDispatchCycle()`: candidates (strictly `status IN ('Backlog','To Do')` + agent/function assignee) → readiness filter → priority sort → atomic wakeup claim (`UPDATE … WHERE status='queued' RETURNING`) → session create/reactivate → `active_run_count` increment → adapter dispatch → `task_dispatched` task_event + activity_log. Failure path: session failed, wakeup failed (terminal), slot freed. Also `settleDispatchOnTerminal()` — see §2.3.
- **`lib/dispatch/adapters/`** — `types.ts` (HarnessAdapter/DispatchResult contract), `hermes-oneshot.ts` (arg-array spawn, no shell, detached fire-and-forget; config: `model`/`toolsets`/`maxTurns`/`workdir`/`command`/`extraArgs`; prompt embeds cockpit-wiring §8 self-registration, env var names only), `index.ts` (registry; unregistered type = readiness blocker).
- **`app/api/cron/dispatch/route.ts`** — CRON_SECRET bearer; gated by `DISPATCH_ENABLED`; watermark cascade (catches completions that bypassed the API); then the cycle; updates `dispatch_state`.
- **`vercel.json`** — `/api/cron/dispatch` every 5 min (spec said 2, its own §10-Q1 floats 5; gate makes frequency low-stakes).
- **Migration `drizzle/0010_operator_dispatch_config.sql`** (applied to Neon): `operators.adapter_type/dispatch_config/max_concurrent/active_run_count` + single-row `dispatch_state` watermark table.
- **Operators seeded:** `claude-code` registered (**paused** — its `claude-tmux` adapter is Phase 3; unpause when it exists); `hermes` → `adapter_type='hermes-oneshot'`, `max_concurrent=3`.
- **Supporting changes:** `createWakeupRequest` now returns `{request, coalesced}`; cascade skips side-effect logging on coalesce (keeps watermark re-runs idempotent); readiness adds max-concurrency + adapter-registry checks.

## 2. Design decisions (deviations from spec, all deliberate)

1. **`DISPATCH_ENABLED` env gate (default off).** The vercel cron runs on Vercel serverless, where `hermes` doesn't exist; adapters spawn *local* processes. The deployed cron is a safe no-op until the flag is set on a host that has the CLIs (run the app on the Mini, or point a local poller at the route with the bearer). Mirrors `NOTION_SYNC_ENABLED`.
2. **hermes = `hermes-oneshot`, not `hermes-delegate`.** §4.3's seed says delegate, but that adapter is Phase 3 and Phase 2's verification is oneshot.
3. **`settleDispatchOnTerminal()` (not in spec).** Gap found during build: the engine increments `active_run_count` but *nothing* decremented it (`markSessionComplete/Failed` had zero callers) — operators would starve at max_concurrent forever. The PATCH route now settles (close sessions, complete wakeups, free slots) on Done/Cancelled, *before* the cascade so freed slots are visible to readiness.
4. **Priority sort is task-field based** (priority text → urgent+important → age), not `lib/priority-engine.ts` scoring: the engine needs project tiers/`estimateHours`/`isCriticalPath` that `tasks` rows don't carry. Slot it in when the data exists.
5. **Candidates filtered on literal statuses**, not `toNormalized()` — the fallback maps *unknown* legacy strings (e.g. `'Completed'`, which exists in prod data) to `'queued'`, which would make stray tasks dispatchable. **Footgun to fix someday.**
6. **First-run watermark initializes to now** without cascading history (the dependency table is newer than all prior completions).

## 3. Verification (all against live Neon + local dev server)

- Build exit 0 after every pass; `next lint` clean on all new files.
- Cron route: no bearer → 401; bearer without flag → `{disabled:true}`.
- E2E with a temp operator whose `dispatch_config.command` override spawns `/bin/sh -c 'echo … >> proof'` through the *same* spawn path as hermes:
  - Cycle 1: T claimed+dispatched (proof file written by the real child process, session `active` with `oneshot-pid-*`, wakeup `running` with runId, run count 1, `task_dispatched` event); dependent U correctly skipped (`prerequisite not satisfied`).
  - T → Done via API: session `completed`, run count 0, U promoted (`dependency_cascade` wakeup + `task_unblocked`).
  - Cycle 2: watermark re-cascaded T idempotently (still exactly 1 `task_unblocked`), U dispatched (proof line 2).
- Real CLI leg: `hermes chat -Q -q "…"` executed once → returned the expected string + its session id. The adapter's exact invocation shape works against the real binary.
- All test rows + temp operator deleted; residual counts 0 across tasks/deps/wakeups/sessions/activity/operators.

## 4. Not done / next (Phase 3 per spec §8)

- **Dispatch is OFF everywhere until `DISPATCH_ENABLED=true` is set** on a host that runs the app next to the CLIs (the Mini). That's the one enable step left to Oli.
- A full real-hermes dispatch (harness reads wiring protocol, self-registers, completes the task) hasn't run — needs the flag on and a supervised first task.
- Phase 3: `claude-tmux`/`hermes-tmux`/`hermes-delegate` adapters, stale-claim reclamation, `GET /api/dispatch/status`, `POST /api/tasks/[id]/dispatch` manual trigger. Then unpause `claude-code`.
- Improvement noted: `-Q` mode prints `session_id: <id>` on stdout — capture it (instead of `stdio:'ignore'`) to store the real hermes session id rather than the pid.
- Reminder from Phase 1 verification: lifecycle rejects `To Do → Done` directly; anything completing tasks programmatically must pass through `In Progress`.
