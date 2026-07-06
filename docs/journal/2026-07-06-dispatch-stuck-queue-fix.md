# Session Log — Dispatch "stuck queue" incident: root cause + fix; nav swap Priority Engine → Dispatch

**Date:** 2026-07-06. **Cockpit task:** 2043cbf5. **Trigger:** Olivier reported 3 tasks sitting in the dispatch queue for 60+ hours.

## 1. The incident, precisely

The three "stuck" items were NOT stuck tasks — all three tasks (Marcimmo legal docs, Paradox booking, Paradox invoice link) were dispatched on 2026-07-03 and **completed by Hermes within ~15 minutes**. What sat for 60+ hours were their `agent_wakeup_requests` rows, still `status='queued'` — which is what the /dispatch queue panel lists.

## 2. Root cause (three-link chain, all fixed)

1. **Stale reclamation ignored task-level liveness.** `reclaimStaleClaims` judged life only by `wakeup.claimedAt` and the session's `lastCheckpointAt`. `hermes-oneshot` runs never checkpoint their session — they prove life through task events (task_started/progress, which bump `tasks.last_activity_at`). Result: every oneshot run longer than its 5-minute threshold was "reclaimed" **mid-flight** — session marked failed, operator slot freed, wakeup re-queued — while Hermes kept working. (Visible in the July-3 timelines: `task_claim_stale_reclaimed` fired between progress events.)
2. **Terminal settle only completed `claimed`/`running` wakeups.** When the task then reached Done, `settleDispatchOnTerminal` had nothing in those states to settle — the re-queued (`queued`) wakeup fell through.
3. **No reconciler.** Nothing ever swept open wakeups whose task was already terminal → the rows leaked forever. Double-dispatch was only avoided because the tasks were In Progress (not a candidate status) when their wakeups were re-queued — luck of the status model, not a guarantee.

## 3. The fix (commit cd94549, probe p48 — TDD, red first)

- `reclaimStaleClaims`: `lastAlive` now includes `tasks.last_activity_at` — a claim is only stale when the wakeup, session, AND task have all been silent past the adapter threshold. Genuinely-dead claims still reclaim (regression-guarded in p48 and p34).
- `settleDispatchOnTerminal`: queued wakeups on a terminal task are now **cancelled** (with `finishedAt`), alongside the existing completed/closed handling.
- New `reconcileTerminalWakeups()` runs at the top of **every** cycle — including paused ones (pause = start no new work; bookkeeping continues) — settling any open wakeup whose task is Done/Cancelled, and logging `dispatch_wakeup_reconciled` per task. This healed the 3 leaked rows automatically and covers any future path that bypasses the task-PATCH hook.

Verification: p48 red on all three defects before the fix, green after; full gate 17/17 green; the production reconciliation of the 3 leaked rows is logged in §6.

## 4. Priority Engine — what's actually in it (Olivier asked)

`lib/priority-engine.ts` contains real, deterministic math: projects get an urgency score (`0.4·profitability-rank + 0.4·deadline-proximity + 0.2·type-weight`, family projects pinned to tier 1) → tiers 1–4; tasks get an Eisenhower quadrant (urgent = due <7d / blocking / critical-path-on-hot-project; important = tier-1 / critical-path), then a P1–P8 priority from a tier×quadrant lookup with floor/ceiling rules, then cross-project ranking.

**Why it feels broken:** the page starves the algorithm —
- Tasks **without a project are silently dropped** (`calculatePriorities` skips them), and most tasks have no `projectId` → near-empty page.
- Key inputs don't exist in the schema and are hardcoded: `estimateHours=4`, `isBlocking=false`, `projectType='income'`, `percentComplete=0`; profitability comes from `projects.budget` (usually null → weight 2).
So the fancy scoring mostly collapses to "due date < 7 days + urgent/important flags" — which the Matrix view already shows. It's not crashing; it's decorative.

**Nav change made:** Dispatch now sits in the Tasks group where Priority Engine was; Priority Engine is out of the menu but `/tasks/priority` still works by URL. If the engine is ever wanted for real, the fix is data (estimate/blocking fields + project links), not math.

## 5. Standing notes

- The dispatch host rebuilds on kickstart — the ~2-5 min build window shows as poller connection-refused lines in poll.log; they stop once `next start` binds :3200.
- Engine was paused during this work (`claude-code-dispatch-fix`) and restored to its pre-work live state after verification (§6).

## 6. Close-out proof

- The three leaked wakeups settled to `cancelled` at 11:51:33Z with one `dispatch_wakeup_reconciled` activity event each (visible in /logs) — the /dispatch queue is empty.
- Full gate 17/17 green (new p48 included; p34 regression-guarded).
- Engine restored to its pre-work state (unpaused) after verification.
- **Host caveat:** the launchd jobs (`com.cockpit.dispatch-*`) dropped out of the GUI domain during this session and this background shell cannot re-bootstrap them (`launchctl managername` = Background). One-command fix from a real terminal: `for p in ~/Library/LaunchAgents/com.cockpit.dispatch-*.plist; do launchctl unload "$p" 2>/dev/null; launchctl load "$p"; done` — or simply log out/in (RunAtLoad reloads them). Until then no local poller is running; the DB and prod dashboard are unaffected.
