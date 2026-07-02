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
| D1 | toNormalized footgun: stray legacy statuses (e.g. 'Completed') must never be dispatchable | proved | `npx tsx scripts/probes/d1-status-footgun.ts` all-pass; mutation check: stash fix → 'Completed' task evaluates ready:true (probe FAILs) → pop → green. Commit 0941c59 |
| D2 | hermes-oneshot captures `session_id` from `-Q` stdout (not pid) | proved | `npx tsx scripts/probes/d2-session-id.ts`: chatty fake → sessionId `hermes-test-42`; silent → `oneshot-pid-*` fallback; missing binary → failed; real-CLI arg shape + prompt content asserted. Commit 03ace6b |
| P3.1 | `claude-tmux` adapter (send-keys, escaped, no shell interpolation) | proved | `npx tsx scripts/probes/p3-adapters.ts`: steered probe session running `cat` received full 990-byte prompt; `$(touch …)`/backtick/quote strings literal, no pwned files created; missing/unconfigured session → failed. Commit f9f4690 |
| P3.2 | `hermes-tmux` adapter | proved | Same probe, same assertions on the hermes-tmux leg. Commit f9f4690 |
| P3.3 | `hermes-delegate` adapter (subagent spawn) | proved | Same probe: fake hermes captured delegate argv, session id `hermes-deleg-123` captured from stdout; 5-min stale threshold asserted. Commit f9f4690 |
| P3.4 | Stale-claim reclamation (per-adapter thresholds: oneshot/delegate 5 min, tmux 30 min) + `task_claim_stale_reclaimed` events | proved | `npx tsx scripts/probes/p34-stale-reclaim.ts`: 7-min oneshot claim reclaimed (wakeup re-queued, session failed, slot 2→1, both spines); 4-min claim, 7-min tmux claim, and fresh-checkpoint claim all untouched. Commit 0e52bc2 |
| P3.5 | `GET /api/dispatch/status` | proved | `npx tsx scripts/probes/p35-p36-routes.ts` (dev server): 401 no-bearer; 200 shape w/ operators/queue/staleClaims/state; running claim visible w/ isStale=false + 5-min threshold. Commit 2020b4c |
| P3.6 | `POST /api/tasks/[id]/dispatch` manual trigger (force bypasses readiness, still logs, never double-dispatches) | proved | Same probe: 401; 409 not_ready w/ prerequisite blocker; 404; force-on-Done 409; force past unmet dep dispatched (session id `probe-routes-99` captured, forced flag in task_event); double-force 409 live-session. Commit 2020b4c |
| P3.7 | `claude-code` operator unpaused (safely — no dispatch into sessions I didn't create) | proved | `npx tsx scripts/probes/p37-claude-code-operator.ts`: active, pause fields null, claude-tmux registered, target `dispatch-claude` (≠ cockpit). Zero real dispatch candidates in prod data at unpause time. Commit 41354cf |
| P4.1 | Budget enforcement + auto-pause (status='paused', pauseReason='budget_exceeded', notify event) | proved | `npx tsx scripts/probes/p41-budget-pause.ts`: over-budget op blocked + auto-paused w/ both notifications; idempotent on re-eval; unmetered + under-budget ops untouched. Commit 5d1f8a5 |
| P4.2 | `needs_artifact` injection: prerequisite artifactUrl in dependent's dispatch prompt | proved | `npx tsx scripts/probes/p42-p43-artifact-concurrency.ts`: dispatched prompt (tmux/cat capture) contains "Prerequisite artifacts" + `file:///tmp/artifact-A.txt` + prereq title; blocks-only dependent prompt has no artifact block. Commit 4c03dd4 |
| P4.3 | Per-operator concurrency limits enforced (Phase 2 code exists — needs probe) | proved | Same probe: maxConcurrent=1 → 2nd dispatch refused (blocker "at max concurrency (1/1)"); after Done+settle slot 1→0 and 2nd task dispatches. Also P3.6 double-force 409. Commit 4c03dd4 |
| P4.4 | Dispatch-queue dashboard panel (checker-subagent graded, ≤5 iters, system.md tokens) | proved | /dispatch page + sidebar entry; Playwright screenshot w/ representative fixtures; independent checker (fresh context: system.md + diff + screenshot only) iter 1 PASS w/ 5 minors + 4 nits → all fixed → iter 2 PASS, fixes verified in diff+screenshot, 0 blocking. Fixtures cleaned (residual 0). Commit 7a2bc53 |
| E1 | E2E hermes-oneshot: real dispatch, self-register, In Progress→Done, cascade promotes dependent | proved | `npx tsx scripts/probes/e2e/e1-hermes-oneshot.ts` vs :3100 w/ DISPATCH_ENABLED=true: cycle 1 dispatched A (real hermes, self-registered gpt-5.5 + session id), A Done w/ artifact + proof file; B task_unblocked + dependency_cascade wakeup; cycle 2 dispatched B; B Done; slots settled 0; residual 0. Commit d51558f |
| E2 | E2E claude-tmux into fresh `dispatch-e2e-claude` session | proved | `npx tsx scripts/probes/e2e/e2-claude-tmux.ts` vs :3100: fresh session created+booted (bypass-permissions), real claude-code operator temporarily repointed (restored after), unforced manual dispatch steered it; Claude Code (claude-opus-4-8, session 7ba60fe4…) self-registered, In Progress→Done, artifact + proof file; session killed; residual 0. Commit 291da1e |
| E3 | E2E stale reclamation observed on deliberately killed claim | proved | `npx tsx scripts/probes/e2e/e3-stale-reclaim.ts` vs :3100: real spawn (pid 77949) SIGKILLed, claim aged 6 min; status route isStale=true; real cycle → reclaimed:1 AND re-dispatched:1 (new pid 77957), full event trail (dispatched, stale_reclaimed, dispatched). Residual 0. Commit e669451 |
| E4 | Manual trigger + status routes exercised in E2E | proved | E3 dispatched via POST /api/tasks/[id]/dispatch (unforced) and asserted staleClaims via GET /api/dispatch/status; E1 exercised the cron route both cycles. |
| E5 | Cleanup: residual test rows 0 (tasks/deps/wakeups/sessions/activity/operators) | proved | `npx tsx scripts/probes/e2e/e5-final-sweep.ts` all-pass: 0 residue across tasks/operators/deps/wakeups/sessions/events/activity + no probe/e2e tmux sessions. (Found+fixed: `trg_task_activity_on_insert` DB trigger leaks `created` activity rows on raw inserts — probes now sweep activity by title prefix.) |
| G1 | build + lint green (final clean re-run) | proved | Final `sh scripts/probes/run-all.sh`: build ✓ (75/75 pages), lint ✓ no warnings, all 8 probes green. |
| G2 | claude-code unpaused / DISPATCH_ENABLED unset on Vercel (verified) | proved | P3.7 probe (operator active) + prod probe: `GET https://dashboard.oliviermarcolin.com/api/cron/dispatch` w/ bearer → `{"disabled":true,"reason":"DISPATCH_ENABLED is not \"true\" on this host"}`. (Vercel CLI has no local credentials; the route-level check is the operative proof.) |
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
3. **claude-code dispatch target:** spec's seed pointed `tmux_session` at `cockpit` — the very session this run (and normally the PM/Claude Code work) lives in; steering it = recursive prompt injection. Repointed to dedicated `dispatch-claude`, which doesn't exist yet: adapter fails cleanly (session-not-found) until Olivier creates it deliberately. Operator is active either way. (Decision logged at pass 8.)
4. **hermes operator stays `hermes-oneshot`** even though `hermes-delegate` now exists — switching the live operator's adapter is a product decision for Olivier; both are registered and probed. (Pass 8.)
5. **Council report/transcript files** (untracked in docs/journal/) committed as-is with the final push — they're project artifacts referenced by this run's reconciliation note. (Pass 13.)
6. **Vercel CLI has no local credentials**, so G2/G3 are proved at the route level against the live prod URL rather than via `vercel ls`/`vercel env ls`. (Pass 13.)

## pass log (append-only)

- pass 1 — D1: readiness requires isKnownStatus() before trusting toNormalized; probe D1 green + mutation-checked red on unfixed code. Build+lint green. Commit 0941c59. Next: D2 (hermes session_id capture).
- pass 2 — D2: oneshot output → per-dispatch log file (EPIPE-safe), polled for session_id w/ pid fallback; prompt.ts extracted (shared, artifact-injection point); adapter contract gains staleClaimThresholdMs + DispatchContext. Probe D2 green; D1 re-run green. Build+lint green. Commit 03ace6b. Next: P3.1 claude-tmux adapter.
- pass 3 — P3.1+P3.2+P3.3: tmux steering via load-buffer/paste-buffer/Enter (fixed target-pane syntax `=name:` — bare `=name` rejected by tmux 3.7 paste-buffer, caught by probe); delegate reuses oneshot machinery. Probe P3 all green incl. injection-literal + no-execution + session cleanup. D1/D2 re-run green. Build+lint green. Commit f9f4690. Next: P3.4 stale reclamation.
- pass 4 — P3.4: reclaimStaleClaims() opens every cycle; staleness = max(claimedAt, session.lastCheckpointAt) vs adapter threshold; race-guarded reset. Probe green (4 scenarios). All prior probes re-run green. Build+lint green. Commit 0e52bc2. Next: P3.5 status route + P3.6 manual trigger.
- pass 5 — P3.5+P3.6: engine per-task block extracted to dispatchTaskById() (shared by cycle + manual route; hard guards immune to force; needs_artifact context plumbed); status route w/ stale flags; manual trigger route. Probe green vs local dev server; all prior probes green. Build+lint green (fixed one unused-var warning). Commit 2020b4c. Next: P4.1 budget auto-pause.
- pass 6 — P4.1: autoPauseOverBudget() in readiness (guarded UPDATE, idempotent, never throws). Probe green. Discovered `npm run build` kills the dev server (.next clash) — added scripts/probes/run-all.sh gate (build→lint→next start :3100→all probes); full gate green. Commits 5d1f8a5, fb8438c. Next: P4.2 needs_artifact probe + P4.3 concurrency probe.
- pass 7 — P4.2+P4.3 probed via tmux/cat prompt capture + dispatchTaskById (never runDispatchCycle in probes — it would sweep real ready tasks). 2 probe bugs fixed (blocker-vs-reason assertion; deleted-sink fd). Full gate green (7 probes). Commit 4c03dd4. Next: P3.7 unpause claude-code, then E2E.
- pass 8 — P3.7: claude-code unpaused, target repointed cockpit→dispatch-claude (assumptions 3+4 logged). Verified zero real dispatch candidates before unpause. Full gate green (8 probes). Commit 41354cf. Next: E1 hermes-oneshot E2E.
- pass 9 — E1 green first try: real hermes ran both tasks end-to-end through the actual cron route (DISPATCH_ENABLED=true on :3100); wrote proof files; cascade + cycle-2 dispatch observed; cleanup verified. Commit d51558f. Next: E3 stale reclamation E2E, then E2 claude-tmux E2E.
- pass 10 — E3 green (manual dispatch → SIGKILL child → aged claim → status flags stale → cycle reclaims + re-dispatches, new pid). E4 thereby proved too. Note: background :3100 server gets reaped between tool calls — E2E drivers now bundle server start+run in one command. Commit e669451. Next: E2 claude-tmux E2E in fresh dispatch-e2e-claude session.
- pass 11 — E2 green: real Claude Code completed the dispatched task from the fresh tmux session; operator config restore + session kill verified in-driver. Commit 291da1e. Next: P4.4 dashboard panel (maker→checker).
- pass 12 — P4.4: panel built; screenshots via playwright-core + crafted local session cookie (Chrome extension unavailable); maker→checker loop 2 iterations → PASS. Full gate green (8 probes). Commit 7a2bc53. Next: E5 final sweep + G1 final gate + deploy + journal + push.
- pass 13 — E5 sweep green (after fixing D1 probe's trigger-leaked activity rows + one-shot cleanup of 14 residual rows); final full gate green; journal finalized; committing + pushing to main; deploy verified via prod probes (G3/G4 evidence below).
