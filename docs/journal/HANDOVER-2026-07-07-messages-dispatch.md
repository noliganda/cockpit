# Handover — 2026-07-07 — Cockpit: messages section shipped + dispatch stuck-queue fixed

**Cockpit task(s):** 65673adc (messages run, Done) · 2043cbf5 (dispatch fix, Done)  ·  **Work lives in:** `dev/cockpit` (main, pushed through bd28a47)

## Done — verified, do not recheck
- Messages spec implemented end-to-end, terminal `success`, all 12 evidence rows proved — journal `2026-07-03-messages-section.md`, prod live (dashboard.oliviermarcolin.com: /messages, / today-view, /api/messages, /api/brief bearer+provenance)
- comm_items table live in Neon via `drizzle/0012_comm_items.sql`; (source,externalId) upsert idempotency proved incl. on prod — probe m2/m3, prod smoke cleaned
- Dispatch "stuck queue" root-caused + fixed (3-link chain: oneshot liveness / terminal settle / no reconciler) — commit cd94549, probe p48 red→green, gate 17/17
- The 3 leaked wakeups settled `cancelled` w/ `dispatch_wakeup_reconciled` events in /logs; /dispatch queue empty — verified in DB 2026-07-06 11:51Z
- Dispatch host healthy on new build: Oli reloaded launchd jobs; clean live poll cycle 2026-07-06 23:02:23, engine unpaused, 0 candidates
- Nav: Dispatch moved into Tasks group replacing Priority Engine entry (route `/tasks/priority` still alive) — commit cd94549, verified on prod
- Priority-engine assessment written (real math, starved inputs: projectless tasks dropped, estimateHours/isBlocking hardcoded) — journal `2026-07-06-dispatch-stuck-queue-fix.md` §4

## Open — in priority order
1. Wire the Email PA (Hermes crons) against the as-built producer contract → next action: build the PA's publish step against journal `2026-07-03-messages-section.md` §2 (fresh runId per triage run; Idempotency-Key header is a no-op on /api/messages)
2. Priority Engine fate → next action: ask Oli — retire `/tasks/priority` entirely, or fund it with real data (estimate/blocking fields + project links); nav slot already reassigned
3. Scoped per-harness tokens (auth still single shared CRON_SECRET bearer) → next action: design token table + middleware in `lib/auth.ts` when prioritized
4. activity_log varchar→text schema drift (db:push proposes TRUNCATING data — never accept) → next action: write a deliberate numbered migration like 0012; until then schema changes go via `drizzle/*.sql` only
5. Design nits (out-of-scope, checker-flagged): chat bubble overlaps feed on mobile /messages; `generated_by` shows raw slug → next action: bundle into next UI pass

## Pointers — read only when its item is picked up
- `docs/journal/2026-07-03-messages-section.md` — item 1 (§2 = the producer contract; §5 = footguns)
- `docs/journal/2026-07-06-dispatch-stuck-queue-fix.md` — items 2, 4 (incident + priority-engine detail)
- `LOOP-STATE.md` — evidence table + assumptions from the messages run (A6 = db:push footgun detail)
- `scripts/probes/run-all.sh` — the verification gate (17 probes); run after any engine/API change
- `~/workspaces/_shared/agent-protocols/cockpit-wiring.md` — item 1 (auth headers, whoami flow)

## First move
Read `docs/journal/2026-07-03-messages-section.md` §2, then start the Email PA publish step against POST /api/messages + POST /api/brief (item 1).
