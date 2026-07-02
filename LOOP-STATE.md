# LOOP-STATE: Complete Cockpit dispatch engine (spec §8 Phases 3+4 + Phase-2 debt), tested, deployed, proven E2E

**Run start:** 2026-07-03. Autonomous (Olivier away). Go-ahead: prompt of 2026-07-03.
**Spec:** `docs/current/architecture/COCKPIT-DISPATCH-ENGINE-SPEC.md` §8 (Phases 3+4), §9 safety, §11 binding NOT-to-build.
**Council reconcile:** council report (2026-07-02) recommended usage-freeze; Olivier's go-ahead supersedes — finish the plan; the E2E proof IS the demo the council asked for. After success → usage, not features.

## done_when (machine-checkable, same commands every pass)

1. `npm run build` exit 0 AND `npm run lint` clean.
2. Every requirement row below = proved via scripted probe (curl / `node scripts/query_db.mjs`), not code-reading.
3. E2E proof local w/ `DISPATCH_ENABLED=true`: (a) hermes-oneshot real dispatch → self-register → In Progress → Done → cascade promotes dependent; (b) claude-tmux dispatch into fresh tmux session `dispatch-e2e-claude` (created+killed by this run; NEVER steer `cockpit` or any other existing session); (c) stale-claim reclamation observed on a deliberately killed claim; (d) manual-trigger + status routes exercised. Residual test rows = 0 across tasks/deps/wakeups/sessions/activity/operators.
4. `claude-code` operator unpaused; `DISPATCH_ENABLED` UNSET on Vercel (deployed cron stays no-op).
5. Deployed to production (deploy story recorded in assumptions once discovered) + prod healthy post-deploy.
6. Journal `docs/journal/2026-07-03-dispatch-phase3-4.md` written; all commits on `main`, pushed.

## evidence table

| # | Requirement | Status | Evidence |
|---|---|---|---|
| D1 | toNormalized footgun: stray legacy statuses (e.g. 'Completed') must never be dispatchable | missing | — |
| D2 | hermes-oneshot captures `session_id` from `-Q` stdout (not pid) | missing | — |
| P3.1 | `claude-tmux` adapter (send-keys, escaped, no shell interpolation) | missing | — |
| P3.2 | `hermes-tmux` adapter | missing | — |
| P3.3 | `hermes-delegate` adapter (subagent spawn) | missing | — |
| P3.4 | Stale-claim reclamation (per-adapter thresholds: oneshot/delegate 5 min, tmux 30 min) + `task_claim_stale_reclaimed` events | missing | — |
| P3.5 | `GET /api/dispatch/status` | missing | — |
| P3.6 | `POST /api/tasks/[id]/dispatch` manual trigger (force bypasses readiness, still logs, never double-dispatches) | missing | — |
| P3.7 | `claude-code` operator unpaused (safely — no dispatch into sessions I didn't create) | missing | — |
| P4.1 | Budget enforcement + auto-pause (status='paused', pauseReason='budget_exceeded', notify event) | missing | — |
| P4.2 | `needs_artifact` injection: prerequisite artifactUrl in dependent's dispatch prompt | missing | — |
| P4.3 | Per-operator concurrency limits enforced (Phase 2 code exists — needs probe) | missing | — |
| P4.4 | Dispatch-queue dashboard panel (checker-subagent graded, ≤5 iters, system.md tokens) | missing | — |
| E1 | E2E hermes-oneshot: real dispatch, self-register, In Progress→Done, cascade promotes dependent | missing | — |
| E2 | E2E claude-tmux into fresh `dispatch-e2e-claude` session | missing | — |
| E3 | E2E stale reclamation observed on deliberately killed claim | missing | — |
| E4 | Manual trigger + status routes exercised in E2E | missing | — |
| E5 | Cleanup: residual test rows 0 (tasks/deps/wakeups/sessions/activity/operators) | missing | — |
| G1 | build + lint green (final clean re-run) | missing | — |
| G2 | claude-code unpaused / DISPATCH_ENABLED unset on Vercel (verified) | missing | — |
| G3 | Prod deploy healthy post-deploy | missing | — |
| G4 | Journal written; commits pushed to main | missing | — |

## stop

- Hard cap: 30 passes. Plateau: 3 passes without measurable progress → stop `stagnated` (a completed phase resets the counter).

## boundaries (end `approval-required` if crossed-needed)

- Never mutate real (non-test) tasks/operators beyond: spec-required additive changes, `claude-code` unpause, `hermes` operator config already spec'd.
- No destructive schema changes. No `DISPATCH_ENABLED` on Vercel. Never steer a tmux session I didn't create (esp. `cockpit`, where this run lives). No external comms. No secret printing. No spend off this machine.

## assumptions (logged at decision time)

1. **Spec §10 defaults (per prompt):** stale thresholds per-adapter (oneshot/delegate 5 min, tmux 30 min); operator adapterType decides adapter (no per-task-type defaults); PM session is NOT an operator; cascade fires on Done only.
2. **Deploy story (to verify at deploy pass):** Vercel Git integration auto-deploys on push to `main` — Phase 2 journal records a push whose bad vercel.json cron *failed the deployment*, which proves pushes trigger builds. Will confirm post-push via `vercel ls` / prod probe.

## pass log (append-only)

(empty — run not started)
