# Session Log — Dispatch Engine Phases 3+4 complete (autonomous run)

**Date:** 2026-07-03
**Repo:** `/Users/agentsmyth/workspaces/dev/cockpit`, branch `main`
**Spec:** `docs/current/architecture/COCKPIT-DISPATCH-ENGINE-SPEC.md` §8 Phases 3+4 (+ Phase 2 debt)
**Run contract:** `LOOP-STATE.md` (repo root) — evidence table, assumptions, pass log
**Terminal state:** `success` — all 22 evidence rows proved; final full gate (build + lint + 8 probes) green from a clean re-run; E2E proofs E1/E2/E3 ran against real harnesses; residual test data 0.

## 1. What landed

### Phase 2 debt
- **D1 — status footgun fixed:** `toNormalized()` maps unknown strings → `'queued'`; readiness now requires `isKnownStatus()` first, so stray legacy statuses (`'Completed'` exists in prod data) can never become dispatchable. `lib/task-lifecycle.ts` exports `isKnownStatus()`.
- **D2 — real hermes session ids:** `hermes-oneshot` redirects child output to a per-dispatch log file under `$TMPDIR/cockpit-dispatch/` and polls it for `session_id: <id>` (`dispatch_config.sessionIdWaitMs`, default 5 s), storing the real hermes session id; `oneshot-pid-<pid>` remains the fallback. File (not pipe) avoids EPIPE-ing the child and leaves a debuggable artifact.

### Phase 3
- **Adapters** (`lib/dispatch/adapters/`): `claude-tmux.ts` + `hermes-tmux.ts` steer an EXISTING tmux session via `load-buffer` → bracketed `paste-buffer` → separate Enter (multi-line-safe; arg-array spawns; injection-probed — command substitutions land literally and execute nothing). `hermes-delegate.ts` = isolated `hermes chat -Q` per task, sharing the oneshot spawn/session-id machinery. Shared prompt builder `adapters/prompt.ts` (cockpit-wiring §8 template). tmux target-pane syntax gotcha: `=name:` (bare `=name` is rejected by tmux 3.7 `paste-buffer`).
- **Stale-claim reclamation** (`engine.ts reclaimStaleClaims()`, runs first in every cycle): claimed/running wakeups whose last sign of life — `claimedAt` or the linked session's `lastCheckpointAt`, whichever is newer — exceeds the operator adapter's threshold are re-queued, sessions failed, slots freed, `task_claim_stale_reclaimed` on both spines. Thresholds (spec §10 Q3 defaults): oneshot/delegate 5 min, tmux 30 min, unknown 15 min.
- **`GET /api/dispatch/status`** (spec §6.4): watermarks, agent operators (slots/budget/pause), wakeup queue with per-claim `isStale` flags, active sessions. Bearer or dashboard session; guests 403.
- **`POST /api/tasks/[id]/dispatch`** (spec §6.2): manual trigger. `?force=true` bypasses ONLY the readiness gate; hard guards always hold (unknown/terminal/in-progress status, live session, missing operator/adapter, concurrency) — force never double-dispatches. Not gated by `DISPATCH_ENABLED` (explicit human action; adapters fail cleanly off-host).
- **Engine refactor:** the per-task dispatch block is now `dispatchTaskById()`, shared by the cycle and the manual route.
- **`claude-code` operator unpaused.** Its dispatch target was repointed `cockpit` → **`dispatch-claude`** (the spec's seed pointed at the tmux session the PM/Claude Code run itself lives in — steering it would be recursive prompt injection). `dispatch-claude` doesn't exist yet, so dispatch to claude-code refuses cleanly until Oli creates that session deliberately.

### Phase 4
- **Budget auto-pause** (spec §9): readiness discovering an over-budget ACTIVE operator pauses it (`status='paused'`, `pauseReason='budget_exceeded'`, `pausedAt`) with an `operator_paused` task_event + activity_log notification. Idempotent (guarded UPDATE); budget=0 = unmetered, never paused. This is the one documented exception to readiness purity.
- **`needs_artifact` injection:** `dispatchTaskById` resolves satisfied needs_artifact prerequisites and every adapter prompt gains a "Prerequisite artifacts:" block (title + artifactUrl).
- **Concurrency limits:** enforced per-operator via live `active_run_count` re-read per dispatch (probed: refuse at cap → settle → slot freed → dispatch).
- **Dispatch dashboard panel** (`/dispatch`, sidebar under Logs): stat row (queued/claimed/running/stale/sessions), operators table (adapter, status+pauseReason, slots, budget), wakeup queue (workspace accent bar, stale badge), active sessions. Client component polling `/api/dispatch/status` every 30 s. Graded by an independent checker subagent against `.interface-design/system.md`.

## 2. Verification layer (new — this repo has no test framework)

`scripts/probes/` — one tsx probe per requirement, each exits non-zero when its feature is broken; all namespaced `[E2E-TEST]`, self-cleaning, residual-checked. `sh scripts/probes/run-all.sh` = build + lint + all probes against `next start :3100`. Key probes were mutation-checked (feature stashed → probe red → restored).

`scripts/probes/e2e/` — NOT in run-all (they spawn real paid harness runs):
- **E1** `e1-hermes-oneshot.ts`: real cron cycle dispatched task A via real `hermes chat -Q`; the harness self-registered (gpt-5.5 + hermes session id), passed In Progress → Done with artifact + proof file; cascade promoted dependent B (`task_unblocked` + `dependency_cascade` wakeup); cycle 2 dispatched B; B completed; slots settled; residual 0.
- **E2** `e2-claude-tmux.ts`: fresh tmux session `dispatch-e2e-claude` created + booted with interactive Claude Code; unforced manual dispatch steered it; Claude Code self-registered (claude-opus-4-8), completed with artifact; session killed; operator config restored; residual 0.
- **E3** `e3-stale-reclaim.ts`: real spawn SIGKILLed, claim aged past threshold; status route flagged it stale; next real cycle reclaimed AND re-dispatched (new pid) with the full event trail.

**This E2E proof is exactly the demonstration the 2026-07-02 LLM council asked for** (real work through the full loop). Olivier's 2026-07-03 go-ahead superseded the council's freeze recommendation for the duration of this plan; the plan is now complete — per both, what Cockpit needs next is **usage, not features**.

## 3. Decisions (assumptions logged in LOOP-STATE.md at decision time)

1. Spec §10 defaults: per-adapter stale thresholds (5/30 min); operator adapterType decides the adapter; the PM session is NOT an operator; cascade fires on Done only.
2. hermes operator stays `hermes-oneshot` (switching to `hermes-delegate` is a product call for Oli; both registered + probed).
3. `DISPATCH_ENABLED` remains UNSET on Vercel — verified live: prod cron returns `{"disabled":true}`. The engine runs only where the CLIs live (the Mini), via a local server + poller.
4. Manual-trigger force semantics: bypass readiness, never bypass double-dispatch guards.
5. Status route auth: bearer or non-guest dashboard session (the panel needs it).

## 4. Deploy

- Deploy story: Vercel Git integration on push to `main` (no manual `vercel deploy`). Verified post-push: (filled at end of run).
- `vercel.json` cron stays daily/03:00 (Hobby plan limit) and is a no-op without the flag — the REAL poller is local on the Mini, unchanged from Phase 2's conclusion.

## 5. What's NOT done / next

- **Nothing remains from spec §8.** Per spec §11, no second board, no auto-assignment, no cross-machine dispatch were built.
- **The one safe next action:** assign one real business task to `hermes` (status To Do, agent assignee), run the app locally with `DISPATCH_ENABLED=true`, curl `/api/cron/dispatch` with the bearer, and watch `/dispatch`. The council's 30-day usage test (≥10 real tasks through the loop) starts there.
- To enable claude-code dispatch for real: create a tmux session named `dispatch-claude` running interactive Claude Code, or repoint `dispatch_config.tmux_session`.
- Known deferred items (pre-existing): per-harness scoped tokens; priority-engine scoring in the dispatch sort; spend tracking is manual (`spentMonthlyCents` has no automatic writer yet — budget auto-pause fires only when something updates spend).

## 6. What the next session must NOT assume

- Do NOT assume the vercel cron dispatches anything (flag unset by design — see §4).
- Do NOT trust `toNormalized()` alone for dispatch decisions — use `isKnownStatus()` first (that was D1).
- Do NOT point any tmux adapter at a session an agent run lives in.
- Do NOT run `runDispatchCycle()`/the cron route locally with the flag on without first checking `SELECT ... FROM tasks WHERE status IN ('Backlog','To Do') AND assignee_type IN ('agent','function')` — the cycle dispatches EVERYTHING ready (the E2E drivers preflight exactly this).
- `lifecycle rejects To Do → Done` — anything completing tasks programmatically must pass through In Progress.
