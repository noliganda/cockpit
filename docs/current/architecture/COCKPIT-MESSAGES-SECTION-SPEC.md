# Cockpit Messages Section — Spec (Handoff)

**Created:** 2026-07-03 — handed off from the Email PA project (`~/workspaces/_shared/docs/superpowers/specs/2026-07-03-email-pa-design.md`)
**Status:** DRAFT for the cockpit workspace (cmux) to build
**Owner after handoff:** cockpit workspace / PM session
**Scope:** the `/messages` section (currently a "Coming soon" stub), plus utilization of the existing Brief section and a real Home view. UI + API + one table. No email infrastructure lives in Cockpit — Cockpit renders and stores what agents publish.

---

## 1. Why

Oli's Email PA (Hermes-side crons) triages three inboxes 3× daily and will soon watch them every 30 minutes. Its output currently lands only in Telegram — ephemeral, scroll-away. Cockpit already positions itself as "channels are the intake, Cockpit is the operational truth", and has three underutilized surfaces:

- **`/messages`** — a stub page.
- **`/brief`** — a working page reading the `briefs` table… which nothing writes to on a schedule.
- **Home (`/`)** — a bare redirect to `/dashboard`.

This spec makes Cockpit the persistent, browsable surface for the comms layer: message digests, drafts awaiting review, daily briefs, project status, and resurfaced important tasks — usable concurrently by Oli in the browser and by the PM workspace session in cmux/tmux (both talk to the same APIs).

## 2. What the PA will send (the producer contract)

Each triage/sentinel run publishes:

1. **Digest items** — one per processed email/message: sender, entity, classification, action taken, draft status, urgency.
2. **A daily brief** — the narrative summary (already fits the `briefs` table).
3. Later: WhatsApp/Slack items through the same shape (`source` field discriminates).

Producers authenticate exactly like existing harness callers: `Authorization: Bearer <CRON_SECRET>` + `x-harness-name` / `x-harness-model` / `x-harness-session-id` headers, `Idempotency-Key` on POSTs.

## 3. Data model — one new table: `comm_items`

Add to `lib/db/schema.ts` (drizzle), names indicative:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `source` | text | `email` \| `whatsapp` \| `slack` \| `manual` |
| `workspaceId` | text | validate against `lib/workspaces.ts` like `POST /api/tasks` (422 `invalid_workspace`) |
| `externalId` | text | provider message id; **unique with `source`** — the idempotency anchor |
| `sender` | text | display form, e.g. `Bruno Leal <bruno.lealdesousa@korusgroup.com>` |
| `subject` | text | subject or first-line preview |
| `preview` | text | 1–3 line summary written by the agent — NOT the raw body |
| `classification` | text | `needs-reply` \| `invoice` \| `newsletter` \| `notification` \| `fyi` \| `spam` \| `unknown` |
| `actionTaken` | text | `drafted` \| `archived` \| `surfaced` \| `left` \| `queued-task` \| `none` |
| `draftId` | text nullable | provider draft id when `actionTaken='drafted'` |
| `draftStatus` | text nullable | `awaiting-review` \| `sent` \| `dismissed` — the drafts-queue driver |
| `urgency` | text | `interrupt` \| `digest` \| `low` |
| `messageTs` | timestamptz | when the underlying message arrived |
| `runId` | text | digest/sentinel run identifier (groups a feed by run) |
| `linkedTaskId` | uuid nullable | Cockpit task created from this item (command channel / queued work) |
| `createdAt` / `updatedAt` | timestamptz | |

Deliberate exclusions: **no raw email bodies** (privacy; mailbox is the source of truth — `preview` only), no threading model in v1 (`externalId` + `subject` suffice), no per-item embeddings (the `activity_log` spine already does embeddings; don't duplicate).

## 4. API

Follow existing conventions: routes in `app/api/**/route.ts`, `zod` validation, `apiHandler` wrapper, error `code`s, bearer-or-session auth.

- **`POST /api/messages`** — bulk upsert: `{ items: CommItem[] }` (cap ~100/call). Upsert on `(source, externalId)` so re-posted runs are idempotent; honour `Idempotency-Key`. Auth: bearer (agents) or session (manual). On success, `logActivity()` one event per run (`eventFamily: 'comms'`, `eventType: 'digest_published'`, `sourceSystem: 'hermes'`) — log the outcome, not one event per email.
- **`GET /api/messages`** — feed with filters: `?workspace=`, `?source=`, `?classification=`, `?draftStatus=awaiting-review`, `?since=`, cursor pagination, newest first.
- **`PATCH /api/messages/[id]`** — status updates only (`draftStatus`, `linkedTaskId`). E.g. Oli sends a draft → agent PATCHes `draftStatus: 'sent'` next run.
- **Fix `POST /api/brief` + `GET /api/brief`:** currently session-cookie only (`getSession()`), so cron agents cannot post briefs. Accept the `CRON_SECRET` bearer path like `/api/tasks` does, record harness provenance, and add `generated_by` from `x-harness-name` when bearer-authed. This is a prerequisite for the whole pipeline — do it first.

## 5. UI

### `/messages` (replace the stub)
- Feed of digest items, newest first, grouped by day (subgroup by `runId` within a day). Card: sender, subject, entity chip (workspace), classification badge, action taken, urgency marker, relative time.
- Filter chips: workspace, source, classification. Default view hides `newsletter`/`spam` (toggle to show).
- **Drafts rail** (right side / top on mobile): all `draftStatus='awaiting-review'` items with age — the standing "you have unsent drafts" list. This mirrors the PA's iMessage nudges; same data, persistent surface.
- Item with `linkedTaskId` links to the task.

### Home (`/`) — replace the redirect with a today view
Composed from existing queries (the `/brief` page already computes most of this):
- Latest brief (from `briefs`).
- Project status strip (open projects w/ rollup signal — `computeRollup` already exists).
- **Resurfaced important tasks:** open tasks that are urgent/important/overdue *and untouched for N days* (default 7, tunable) — the "don't let it rot" list.
- Digest summary: counts from today's `comm_items` (new / drafts awaiting / interrupts) linking to `/messages`.
- Keep it read-mostly and fast; deep work happens in the dedicated sections. Users who want the old behaviour still have `/dashboard` in the nav.

### `/brief`
No redesign — it works. Two additions: show `generated_by` + generated-at provenance on the brief card, and an empty-state that says briefs arrive automatically from the PA (instead of looking broken when the table is empty).

## 6. Concurrency with the PM session (cmux/tmux)

Nothing special to build — this falls out of the API design: the PM workspace session reads `GET /api/messages` / `GET /api/brief` and writes `POST /api/brief` or task events through the same bearer-authed endpoints the crons use. Two producers (PA crons + PM session) and two consumers (browser + PM session) share one store. The only requirement is what §4 already mandates: idempotent upserts and provenance headers, so concurrent writers can't duplicate or clobber.

## 7. Non-goals

- Cockpit does not read mailboxes, hold email credentials, or send email/notifications. Producers push to it.
- No raw message bodies stored (previews only).
- No reply/compose UI in v1 — drafting stays in the mailbox where Oli sends from.
- No WhatsApp/Slack ingestion work now — the `source` field is the only accommodation.
- No realtime/websocket push in v1 — poll/refresh is fine at this volume.

## 8. Acceptance criteria

1. `npm run build` clean; schema pushed (`npm run db:push`).
2. A bearer-authed `POST /api/messages` with 20 items renders them in `/messages` grouped by day; re-posting the same payload creates zero duplicates.
3. `POST /api/brief` works with the bearer + harness headers; the brief renders in `/brief` and on Home with provenance.
4. Home shows brief, project status, resurfaced tasks (an old urgent task actually appears), and today's digest counts.
5. Drafts rail shows an `awaiting-review` item; after `PATCH` to `sent`, it leaves the rail.
6. An unauthenticated POST is 401; a guest session cannot write (403), matching existing auth behaviour.
7. One `activity_log` event per published run, visible in `/logs`.

## 9. Suggested build order

1. `/api/brief` bearer fix (small, unblocks the PA immediately).
2. `comm_items` schema + `POST/GET /api/messages`.
3. `/messages` UI + drafts rail.
4. Home today view.
5. `PATCH` endpoint + provenance polish.
