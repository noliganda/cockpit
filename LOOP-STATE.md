# LOOP-STATE: Messages section — implement COCKPIT-MESSAGES-SECTION-SPEC.md to completion (autonomous run #3, 2026-07-03)

**Run start:** 2026-07-03. Prior run (dispatch ops live) closed `success` at c1f6777.
**Cockpit task:** 65673adc-040a-4168-a0b5-2b85afcb0e31.
**Spec (the contract):** `docs/current/architecture/COCKPIT-MESSAGES-SECTION-SPEC.md` (committed da378fc). §7 non-goals binding. §8.1–8.7 are the requirement rows.
**Prior machinery reused:** `scripts/probes/run-all.sh`, `_probe-env.ts` conventions (`[E2E-TEST]` prefix exists; this run's task fixtures use `[MSG-TEST]` per the run prompt; comm_items/briefs probe rows namespaced via `msgtest-` runId/externalId prefixes).

## ⚠ STANDING HAZARD — dispatch engine

- Pre-run engine state recorded **2026-07-03T11:26Z: paused=false, pausedAt=null, pausedBy=null** (via `GET /api/dispatch/status` on :3200).
- Engine PAUSED at 2026-07-03T11:26:51Z by `claude-code-msgs-run` (activity-spine logged).
- **At close: restore to UNPAUSED** (restore-don't-clobber, p45 discipline), with proof in the pass log.
- NEVER create an agent-assigned test task. All test tasks: human-assigned, title prefix `[MSG-TEST]`, created+deleted same pass, residual 0 verified.

## done_when (ALL of, same commands every pass)

1. `sh scripts/probes/run-all.sh` fully green (build + lint + all pre-existing probes + new msg probes).
2. §8.1–8.7 each proved by a scripted probe (see evidence table).
3. Mutation checks: break `(source, externalId)` upsert → dup probe red; drop workspace validation → 422 probe red; restore → green.
4. Independent design checker PASS on `/messages` (with drafts rail) and Home today-view — fresh-context subagent, sees only `.interface-design/system.md` + diff + screenshots; maker→checker loop cap 5.
5. Schema pushed via `npm run db:push` (DATABASE_URL_UNPOOLED; additive only — one new table `comm_items`).
6. Pushed to `main`; prod verified: 401 bare POST, 200 bearer GET on new routes; `/messages` + Home render; prod test writes namespaced + cleaned same pass.
7. Producer-contract note for the Email PA appended to the journal (as-built URLs, payload schema, auth headers, idempotency semantics, deviations from spec §2–§4).
8. Journal `docs/journal/2026-07-03-messages-section.md` + evidence table complete; engine pause state restored with proof.

## evidence table

| Row | Requirement | Status | Evidence |
|---|---|---|---|
| R1 | §8.1 build clean + schema pushed | missing | |
| R2 | §8.2 20-item bearer POST renders grouped-by-day in /messages; identical re-post → zero dups | missing | |
| R3 | §8.3 brief via bearer+harness headers renders in /brief and Home with provenance | missing | |
| R4 | §8.4 Home: brief + project status strip + resurfaced tasks (aged [MSG-TEST] urgent task appears, then cleaned) + today digest counts | missing | |
| R5 | §8.5 drafts rail shows awaiting-review; empties after PATCH to sent | missing | |
| R6 | §8.6 unauth POST 401; guest session write 403 | missing | |
| R7 | §8.7 exactly ONE activity_log event per published run, visible in /logs | missing | |
| R8 | mutation checks: upsert anchor broken → probe red; workspace validation dropped → probe red; restored green | proved | mut1: conflict target → [id] ⇒ m2 red on "identical re-post" (500); mut2: validation `if(false)` ⇒ m2 red on 422 + revealed orphan row/event damage; restored ⇒ m2 green |
| R9 | design checker PASS on /messages + Home | missing | |
| R10 | deployed to prod, routes verified (401/200), pages render, no runtime errors | missing | |
| R11 | producer-contract note in journal | missing | |
| R12 | engine pause state restored to recorded value (unpaused), proof logged | missing | |

## stop

- Hard cap: **20 passes**. Plateau: 3 passes without measurable progress → `stagnated`, stop honestly.
- Terminal states only: success | blocked (ONE exact ask) | approval-required | exhausted | stagnated. Never report non-success as success.

## boundaries (end `approval-required` if needed)

Agent-assigned test tasks; raw message bodies stored anywhere; email credentials; destructive schema changes; mutating real tasks/operators; external comms; printing secrets.

## assumptions (logged at decision time)

- A1: Resurfacing threshold default **7 days** untouched, keyed on `lastActivityAt` (fallback `updatedAt`), tunable via `?staleDays=` on Home data fetch — spec says "default 7, tunable".
- A2: Cursor pagination: `?cursor=<base64(messageTs|id)>&limit=` (default 50, cap 100) returning `{ items, nextCursor }`; keyset on (messageTs desc, id desc).
- A3: `/messages` empty state copy: "No messages yet. Digest items arrive automatically from the Email PA."
- A4: `briefs` stays a raw-SQL table (not added to drizzle schema) — the brief fix touches auth/provenance only, no schema churn. `comm_items` IS drizzle.
- A6: `npm run db:push` CANNOT be run to completion against live Neon: pre-existing drift makes it propose dropping `briefs` (fixed — table now mirrored in drizzle schema) and varchar→text truncation of `activity_log`/`actions` (left alone, NEVER accept). Canonical schema application = numbered SQL migration `drizzle/0012_comm_items.sql`, applied 2026-07-03 via DATABASE_URL_UNPOOLED, verified (17 cols, unique + FK constraints present). Also applied two safe pre-existing additive constraints push kept proposing (`user_bases_share_token_unique`, `log_share_tokens_token_unique` — both dup-free, 1 row each). §8.1 "schema pushed" = table live in Neon + drizzle schema matches, proved by probe.
- A5: Fixture namespacing: task fixtures `[MSG-TEST]` title prefix; comm_items fixtures `msgtest-` prefix on runId AND externalId; brief fixtures `generated_by` = `msgtest-probe`.

## pass log (append-only)

- **Pass 3** — R8 mutation checks done (break→red→restore→green, both anchors). m2 covers §8.2/§8.5/§8.6/§8.7 API halves + pagination + 422. Next: Pass 4 = /messages UI + drafts rail (read system.md first), then Home.
- **Pass 2** — comm_items in drizzle schema + migration 0012 applied to Neon (17 cols, uq+FK verified); briefs mirrored into schema to defuse db:push DROP; POST/GET /api/messages + PATCH [id] landed (8c0e502). Gate green (13 probes incl. m2). A6 logged (db:push footgun).
- **Pass 1** — `/api/brief` fix landed (c50bd67): getSessionData + guest 403, zod, apiHandler, generated_by ← x-harness-name, one brief_published activity event. Probe m1 green; full gate green (12 probes). **Incident:** gate left engine UNPAUSED — p46's finally forced `paused:false` instead of restoring entry state. Re-paused immediately (11:32Z), fixed p46 to snapshot/restore + assert (16a235a); verified pause survives p46 against :3200. R6-for-briefs half proved via m1. Next: Pass 2 = comm_items schema + POST/GET /api/messages + probe m2.
- **Pass 0** — oriented: read spec, run-all.sh, p45, ops-live journal, auth/api-handler/workspaces/tasks-route conventions, brief route+page, home/messages stubs. DB inspected: `briefs` exists (2 rows; id/content/generated_at/workspace_id/generated_by), `comm_items` absent. Cockpit task bound 65673adc. Engine pre-state paused=false recorded; engine PAUSED (pausedBy=claude-code-msgs-run). Fresh contract written. Note: `getSession()` already honours the bearer, so the §4 brief fix is provenance (generated_by from x-harness-name), guest 403, zod, apiHandler, logActivity — not a raw auth hole for bearer, but guest-write IS currently possible (getSession presence check only). Next: Pass 1 = /api/brief fix + probe m1.
