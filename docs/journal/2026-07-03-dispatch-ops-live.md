# Session Log — Dispatch ops live: pause toggle, dialog fix, queue command, live host (autonomous run #2)

**Date:** 2026-07-03 (same day as Phases 3+4; Olivier's "do all four")
**Repo:** `main`. **Run contract:** `LOOP-STATE.md`. **Cockpit task:** bccf436a.
**Terminal state:** `success` — all evidence rows proved; final gate green; engine left LIVE (see §4).

## 1. What landed

- **R1 — soft-pause toggle** (migration 0011, applied): `dispatch_state.paused/pausedAt/pausedBy`; engine checks it after stale reclamation (pause = start no new work; reclamation + cascade bookkeeping continue); unforced manual dispatch respects it, `force` overrides; `POST /api/dispatch/pause` (bearer or dashboard session, guests 403) logs `dispatch_paused/resumed` to the activity spine; `/dispatch` gets Pause/Resume + amber paused pill (independent checker: PASS; its two minors fixed — dedicated action-error banner, amber icon differentiating it from Refresh).
- **R2 — dialog typing fixed** (two bugs): virtual harness entries (`VIRTUAL_HARNESSES`) shadowed real registry ids (hermes, claude-code) → duplicates in the dropdown; AND a race where selecting hermes before `/api/operators` resolved mistyped the assignee as `function`. Virtual entries now render only after the registry loads and are filtered against it; `handleSave` re-resolves `assigneeType` from the registry. Probes: p46 (API shape → readiness-ready), p47 (real-browser dropdown + typing hint; mutation-checked).
- **R3 — `cockpit-task queue` + `dispatch`** subcommands (shared `_shared/tools/cockpit-task`, commit 3d1c986) + `cockpit-queue` skill (`~/.claude/skills/cockpit-queue/`) + wiring-doc §0 section. Brief convention: **Goal / Done when / Artifact / Don't**, one bounded outcome, `-D` for dependency chains.
- **R4 — live dispatch host on MythMac** (interim until the Mini): launchd `com.cockpit.dispatch-server` (build + `next start :3200`, the ONLY place `DISPATCH_ENABLED=true` is set), `com.cockpit.dispatch-poll` (curls the local cycle every 3 min — the real trigger; the Vercel cron stays a no-op), `com.cockpit.dispatch-claude` (persistent `dispatch-claude` tmux session running Claude Code via `exec` from a login shell — if Claude dies the pane dies with it, so a later paste can never land in a bare shell). Install/uninstall: `ops/install-dispatch-host.sh`.

## 2. Bugs the E2E caught (all fixed, probe-covered)

1. **launchd PATH:** `zsh -lc` loads `.zprofile`, not `.zshrc` → `spawn hermes ENOENT`. `dispatch-server.sh` now extends PATH and warns when hermes/tmux are missing.
2. **Dialog operator-typing race** (above).
3. **Probe hygiene:** the gate now kills stale `:3100` servers (a survivor served an OLD build to every probe — the source of "phantom" flakes); p45 snapshots/restores the ops pause state instead of forcing it off; p42 is pause-immune via `force` (hard guards still asserted); p46 throws instead of early-`finish()` (process.exit skips `finally`).

## 3. E2E — the mobile-flow rehearsal (e6-mobile-flow, all green)

With the launchd poller live: a task created **through the real dashboard dialog** (headless Chrome driving the actual UI, Hermes selected, agent-typed row) and a task created via **`cockpit-task queue`** were BOTH dispatched by the next poll cycle with zero manual dispatch calls, both completed Done by real hermes (gpt-5.5) with artifacts + proof files, everything cleaned (residual 0). This is exactly the phone flow: create anywhere (prod dashboard writes the same Neon DB) → the Mac dispatches within ~3 min.

## 4. Final state & safety sweep

- Live-candidate sweep at close: **zero real dispatch candidates** → per the run contract the engine is left **LIVE (unpaused), poller running every 3 min**, `dispatch-claude` session up.
- The one meta-task created on purpose (`Queue the first real business task…`, e2676f55) is **human-assigned to oli** — permanently outside the candidate pool.
- Vercel: `DISPATCH_ENABLED` still unset; prod cron answers `{"disabled":true}` (verified post-deploy).

## 5. Runbook — start using Cockpit

**Queue work (any of):**
- **Phone/dashboard:** dashboard.oliviermarcolin.com → Tasks → New task → assignee 🤖 Hermes → status To Do/Backlog. Put the four-line brief in the description: `Goal / Done when / Artifact / Don't`.
- **CLI/agent:** `cockpit-task queue "Title" -w korus -a hermes -p high -d "Goal: … Done when: … Artifact: file:///… Don't: …"` (add `-D <task-id>` to chain).
- **Any Claude session:** say "queue a task for hermes" — the `cockpit-queue` skill does the rest.

**Then:** the Mac dispatches it within ~3 min. Watch `/dispatch` (queue, running, stale) or `tail -f ~/Library/Logs/cockpit-dispatch/poll.log`.

**Emergency stop:** `/dispatch` → **Pause dispatching** (works from the phone — DB-backed, stops every host; amber pill shows who/when). Resume the same way. Force-dispatch overrides a pause deliberately.

**Claude Code as operator:** the `dispatch-claude` tmux session is kept alive by launchd (bypass permissions — only bearer-holders can feed it tasks). Assign a task to the Claude Code operator and it dispatches there.

**Host management:** reinstall jobs `sh ops/install-dispatch-host.sh`; restart server after a code pull `launchctl kickstart -k gui/$UID/com.cockpit.dispatch-server` (it rebuilds on start); uninstall per the header of the install script. **Mini migration later:** run the same installer on the Mini, uninstall here — spec §11's local-host rule, nothing else changes.

## 6. What the next session must not assume

- The gate (`sh scripts/probes/run-all.sh`) is safe while the live poller runs — probes are pause-state-aware and use `force`/namespaced operators — but E2E drivers in `scripts/probes/e2e/` still preflight the candidate pool; keep that.
- `spentMonthlyCents` still has no automatic writer; budget auto-pause fires only when spend is recorded.
- The launchd server serves the build from its last (re)start — kickstart after pulling code.
- Probes must never `finish()` inside `try` (exits skip `finally`) and must restore ops pause state.
