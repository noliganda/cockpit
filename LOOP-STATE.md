# LOOP-STATE: Dispatch ops live — pause toggle, dialog fix, queue command+skill, live dispatch host (four approved features, "do all four" 2026-07-03)

**Run start:** 2026-07-03 (follows Phase 3+4 run, terminal success, closed in git history).
**Cockpit task:** bccf436a-9a14-43db-96c4-ba8b75c7e06f.
**Prior machinery reused:** `scripts/probes/run-all.sh`, probe conventions, journal format.

## done_when (same commands every pass)

1. `sh scripts/probes/run-all.sh` fully green (build + lint + all prior probes + p45/p46 + new probes this scope needs).
2. R1–R4 proved by probe/E2E, mutation-checked where it matters (pause check stashed from engine → p45 red; dialog fix reverted → dialog UI probe red).
3. E2E mobile-flow rehearsal: launchd poller live + engine on this Mac — (a) task created through the REAL dashboard UI picking an agent operator dispatches on the next poll cycle untouched; (b) `cockpit-task queue` task dispatches too. Namespaced, cleaned, residual 0 (E5 bar).
4. Live-candidate safety sweep before leaving the engine unpaused: enumerate real qualifying tasks; any unintended → final state paused=true + say so; empty/intended → leave live. Candidate list + final state in the report.
5. Pushed to main; prod verified: /dispatch pause toggle flips shared-DB flag + activity event (flipped back); prod cron still `{"disabled":true}`.
6. Journal `docs/journal/2026-07-03-dispatch-ops-live.md` incl. "start using Cockpit" runbook.

## evidence table

| # | Requirement | Status | Evidence |
|---|---|---|---|
| R1 | Pause toggle: dispatch_state.paused + engine gate + /dispatch UI + activity logging | proved (prod-UI half under DEP) | p45 green; mutation check: both engine pause gates neutered → paused cycle proceeded + unforced dispatch went through (3 FAILs) → restored green. Commit ed301f6 |
| R2 | Dialog-created agent tasks genuinely dispatchable (+ dedupe of shadowed virtual harnesses) | proved | p46 (API shape → readiness ready:true, candidate filter matches) + p47 real-browser (one entry per operator id; Hermes selection shows agent typing hint); mutation check: filter reverted → duplicates → p47 red → restored. Commits 414f017, 7c28c6b, hardening |
| R3 | `cockpit-task queue` + `dispatch` subcommands + cockpit-queue skill + wiring-doc section, brief template Goal/Done when/Artifact/Don't | proved | queue smoke (row verified: To Do/agent/hermes/prio/desc, cleaned) + E6 leg (b): queue-created task dispatched by poller + completed by real hermes. Skill registered (`cockpit-queue`); wiring §0 updated. _shared commit 3d1c986 pushed |
| R4 | Live dispatch host: com.cockpit.dispatch-server/-poll/-claude launchd jobs installed, surviving, polling; dispatch-claude session alive | proved | 3 jobs loaded (launchctl list, exit 0); server :3200 dispatchEnabled:true; poll.log shows 3-min cycles w/ full summaries; dispatch-claude session created + "ready" in 3s; PATH bug (`spawn hermes ENOENT` under launchd) found by E6 and fixed in dispatch-server.sh. Commits 3429b72, 6c202cc |
| E2E | Mobile-flow rehearsal (dashboard-UI task + queue task both auto-dispatch on poll cycle; cleaned) | proved | e6-mobile-flow all-pass: dialog task (agent-typed row) + queue task dispatched by the launchd poller with ZERO manual dispatch calls; both Done by real hermes (gpt-5.5), proof files written; paused-safety entry/exit; residual 0. Caught 2 real bugs on the way (launchd PATH; dialog operator-typing race — both fixed, second one probe-covered) |
| SW | Live-candidate safety sweep + final engine state decision | proved | `_candidate-sweep.ts`: ZERO real dispatch candidates (twice — pre-E6 and at close) → engine left LIVE (paused=false), poller cycling (poll.log 14:43:59 success), dispatch-claude session up. Only meta-task e2676f55 is human-assigned (never a candidate) |
| DEP | Pushed; prod pause toggle verified (flip + flip back + activity); cron disabled | proved | Push 2efa61b..42a0655 → prod pause route live ~80s; flip ON (paused:true, pausedBy recorded) → status reflects → flip OFF (final live state); cron `{"disabled":true}`. Checker re-grade of the pause control: PASS (2 minors fixed, commit 78df91e) |
| J | Journal + runbook; Cockpit task closed; dogfooded follow-up task queued for the council's 30-day test opener | proved | `docs/journal/2026-07-03-dispatch-ops-live.md` (incl. §5 runbook); follow-up task e2676f55 created (human-assigned by design, assumption 4); Cockpit task bccf436a closed Done w/ artifact |

## stop

Hard cap 15 passes; plateau 3 passes without measurable progress → `stagnated`.

## boundaries (end `approval-required`)

No real task/operator mutations beyond approved scope; no destructive schema changes; no DISPATCH_ENABLED on Vercel; launchd `com.cockpit.*` only; never steer tmux sessions I didn't create (dispatch-claude, which I create, is mine to steer); no external comms; no secrets printed; no spend off this machine.

## assumptions (logged at decision time)

1. (pre-logged) MythMac is the interim dispatch host until the Mini takes over; `dispatch-claude` runs Claude Code with bypass permissions, standard config.
2. Migration 0011 was already applied to Neon during the interrupted pass (verified: `dispatch_state.paused=false` singleton row) — landing the SQL file is bookkeeping, not a re-apply.
3. R2 has two halves: the API path (p46) and the dialog UI (duplicate hermes/claude-code entries under "Harnesses/Functions" shadowing the registry — filtered out). UI half gets a real-browser probe (playwright-core devDep, system Chrome, graceful SKIP if Chrome absent).
4. The dogfooded follow-up task ("queue the first real business task") is assigned to **oli (human)** on purpose — it's a decision only Olivier can make, and a human assignee keeps it permanently outside the dispatch candidate pool.

## pass log (append-only)

- pass 1 — inventory: all uncommitted work adopted (it was this session's interrupted pass; gate green incl. p45/p46 after fixing p46's exit-skips-finally leak that left pause ON). Landed as 3 bounded repo commits (ed301f6 R1, 414f017 R2, 3429b72 R4-files) + _shared 3d1c986 (R3, pushed). Rows stay weak until mutation checks + install + E2E. Next: R1 mutation check.
- pass 2 — R1 mutation check green (gates neutered → p45 red on exactly the pause checks → restored green). R1 proved.
- pass 3 — p47 real-browser dialog probe (playwright-core devDep, system Chrome, SKIP if absent); R2 mutation check green (filter revert → duplicate hermes/claude-code → red). Gate flaked once on cold-start /tasks; retry+diagnostics added; full gate green. R2 proved. Next: R4 install launchd host (paused-first for safety).
- pass 4 — R4 installed paused-first: 3 launchd jobs loaded; server :3200 up in ~20s; dispatch-claude ready in 3s; first scheduled poll ran a real cycle honoring pause. (Prod pause attempt 404'd — route not deployed yet; paused via shared DB instead.)
- pass 5 — E6 first run: poller+engine perfect but `spawn hermes ENOENT` (launchd PATH lacks ~/.local/bin — .zprofile vs .zshrc). Fixed in dispatch-server.sh + warnings. Second run: 1 FAIL — dialog race typed assignee as 'function' (virtual entry selectable before /api/operators resolves). Fixed: optgroup gated on registry load + save-time type re-resolve. Third run: E6 all green. Commit 6c202cc.
- pass 6 — gate regressions triaged to root causes: p42 red = probe not pause-immune (now force-based; hard guards still asserted); p47 red = STALE :3100 server serving old builds (gate EADDRINUSE unseen) — gate now owns the port; p45 was clobbering ops pause state in finally (now snapshots+restores). Full gate green. Commits d2ec520, 5a830c0.
- pass 7 — /dispatch pause control sent to independent checker (fresh context: system.md + panel diff + running/paused screenshots). Awaiting verdict; then safety sweep + dogfood + deploy + journal.
- pass 8 — checker PASS (2 minors fixed: action-error banner, amber pause icon; commit 78df91e). Safety sweep: zero candidates → live. Dogfood task e2676f55 (human-assigned). Journal + runbook committed; pushed; prod pause flip on→off verified; cron disabled. Final :3200 restart onto the final build; closing gate all green from clean run; E5 sweep clean; live state survived the gate (p45 restore verified in anger). → **TERMINAL: success** (8 passes of 15; no plateau).
