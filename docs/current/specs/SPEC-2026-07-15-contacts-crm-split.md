# Cockpit — Contacts Rolodex Cleanup + One-Way Twenty Sync — Spec

**Status:** active (amended 2026-07-15 after Oli-approved challenge: Rolodex becomes a read-only directory; sync becomes one-way inbound)
**Owner:** dev/cockpit session (dispatched by PM session; bind the Cockpit task given at dispatch)
**Brief:** Oli, 2026-07-15 — the Contacts section still carries the pre-Twenty custom CRM (pipeline board, organisations). Strip it to a pure Rolodex. **Descope:** Twenty stays entirely separate from Cockpit — no new CRM section; Twenty's own UI (tailnet `:8443`) is the CRM UI. **Amendment:** the person-sync cycle is broken — Cockpit becomes a read-only view.
**Companion spec:** `dev/crm/SPEC-2026-07-15-enrichment-signals-d365.md` (data plane; defines the topology rule this spec implements the Cockpit side of).
**Last updated:** 2026-07-15

## The topology rule this spec enforces

The sync graph is **acyclic**: Baïkal → Twenty → Cockpit. **One writable home per field** — identity (name/emails/phones) = Contacts app only; CRM state = Twenty only; Cockpit writes no person data. Why: today Cockpit⇄Twenty is two-way, and a phone edited in the Cockpit Rolodex gets pushed to Twenty, reverted by the Baïkal bridge within 30 min, and the revert pulled back into Cockpit — the edit silently evaporates. Cycles are where churn and pollution come from; this spec removes Cockpit's write leg entirely.

## Scope

**In:** route/label fix (`/crm` → `/contacts`) · Rolodex cleanup (remove every old-custom-CRM surface) · `organisations` snapshot + drop · **sync simplification: remove the outbound (Cockpit→Twenty) leg; Rolodex person data becomes read-only** · dashboard quick-add removal.
**Out:** any CRM section in Cockpit (descoped) · changes to the inbound webhook/reconcile beyond deleting outbound code · enrichment/signals/D365 (data-plane spec).

**The naming trap this fixes:** the sidebar item "Contacts" routes to `/crm` (`components/sidebar.tsx:28`) and the palette calls it "Go to CRM". After this spec: `/contacts` = the Rolodex; **no `/crm` route exists in Cockpit** — CRM lives in Twenty.

## Approach

**Phase A — route/label fix.**
Move `app/crm/` → `app/contacts/` (page, client, `[id]`, loading). Sidebar `NAV_ITEMS`: "Contacts" → `/contacts`. Command palette: "Go to CRM" → "Go to Contacts". Redirect `/crm` and `/crm/[id]` → `/contacts` equivalents. Grep the repo for other hardcoded `/crm` links (`lib/search.ts`, `components/search-overlay.tsx`, …).

**Phase B — Rolodex cleanup (REMOVE the old custom CRM; per PM recon 2026-07-15).**
Remove:
- Pipeline (Kanban) tab + drag logic — `crm-client.tsx:1092-1192, 531-549, 617-624`
- Organisations tab + dialogs — `crm-client.tsx:350-514, 973-1090`
- `organisations` table + `app/api/organisations/*` — **snapshot then drop, no reconcile**: export all rows to a JSON snapshot committed under `docs/archive/`, then drop. (The data predates Twenty; the ORG mapping already derived 658 companies from the *current* address book — matching stale rows has near-zero yield. The snapshot is the recovery path.)
- `PIPELINE_STAGES` (`types/index.ts:29`) + stray `PipelineStage` type (`:403`)
- Batch pipeline-stage endpoint (`app/api/contacts/batch/route.ts` PATCH)
- Pipeline Stage row on the contact detail page; `pipelineStage` cell in KORUS metrics (`korus-metrics-client.tsx:238`)

Keep: `contacts` table · VCF export · `project_contacts` linking + `projects.clientId/leadGenId/projectManagerId` pickers · the inbound Twenty sync (webhook + reconcile) · Mini worker + launchd (minus its outbound section, Phase C).

**DO-NOT-DROP (sync dependency):** `contacts.pipeline_stage`, `next_reach_date`, `source`, `company`, and the `twenty_*`/`vcard_uid` link columns — `lib/crm/twenty-mapping.ts` reads them inbound; they simply stop being rendered/edited.

**Phase C — one-way sync + read-only Rolodex.**
- **Delete the outbound leg:** `pushContactToTwenty` + `contactsPendingOutbound` in `lib/crm/twenty-sync.ts` and the outbound section of `scripts/crm/twenty-worker.ts`. Keep webhook receiver + inbound reconcile untouched. Grep for any other callers before deleting.
- **Rolodex UI/API becomes read-only for synced person fields** (name/emails/phones/jobTitle/company/linkedin/source): display only. **Cockpit-local fields stay editable** — `notes`, `tags` (their writable home IS Cockpit; they never sync). Trim the API surface to match: no person create, no PATCH of synced fields, no delete; PATCH restricted to notes/tags; batch endpoints reduced accordingly. Project linking untouched (it writes `project_contacts`, not person data).
- **Remove the dashboard "New Contact" quick-add** (`app/dashboard/dashboard-client.tsx:213`); replace with a hint: contacts are born in the Contacts app and appear here within ~45 min (bridge 30 min + reconcile 15 min).
- **Existing unlinked local rows** (manually created pre-cleanup, no `twenty_person_id`): leave them, render a subtle "local" badge; cleanup is a later, separate decision.

## Milestones

| # | Milestone | Owner | Evidence |
|---|-----------|-------|----------|
| 1 | `/contacts` live, labels/routes consistent, old `/crm` links redirect | dev/cockpit | deploy URL + click-through |
| 2 | Rolodex clean: no pipeline/orgs UI; orgs snapshot committed; table dropped | dev/cockpit | commits + snapshot file in docs/archive/ |
| 3 | One-way sync live: outbound code deleted; Rolodex read-only for synced fields; quick-add removed | dev/cockpit | worker log (inbound-only run) + commit |

## Acceptance Criteria

- [ ] Sidebar/palette say "Contacts" → `/contacts`; no Cockpit route or nav item says "CRM"; old `/crm` URLs redirect.
- [ ] Rolodex renders zero pipeline/organisation UI; VCF export and project linking still work.
- [ ] No UI or API path can write a synced person field (verify: attempt returns 4xx/absent); notes/tags editing still works.
- [ ] Outbound sync code deleted (`pushContactToTwenty` has zero references); a worker run completes inbound-only; editing a person in Twenty still lands in Cockpit.
- [ ] `organisations` table + API dropped, JSON snapshot committed FIRST (verify snapshot row count = table row count at export).
- [ ] `docs/current/integrations/twenty-crm-sync.md` updated: one-way inbound, `/contacts` route, quick-add removal noted.
- [ ] Build/lint green on main; each phase = its own commit(s).

## Dependencies & Inputs

- PM recon report 2026-07-15 (file/line inventory above) — the KEEP/REMOVE map.
- Companion data-plane spec §Topology rule — the contract this implements.
- Deploy via the existing Vercel flow; the Mini worker change ships via the existing launchd job (no plist change expected).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Outbound code referenced somewhere unexpected | Low | Build break | Grep all callers before delete; build+lint gate |
| A workflow relied on editing contacts in Cockpit | Low | Oli annoyance | Contacts app is the documented home; local notes/tags still editable |
| Orgs snapshot misses data | Low | Data loss | Row-count check snapshot vs table before drop |
| Route rename breaks bookmarks | Low | Annoyance | Redirects in Phase A |

## Open Questions

None — descope + amendments Oli-approved 2026-07-15 (no CRM section; one-way sync; read-only Rolodex; snapshot-then-drop orgs).

---

## For Agents

This spec is the contract. Build to it, one phase per commit-set, straight to main, evidence per milestone. Milestones are `cockpit-task log` lines, never `done`. If a question comes up that's not covered, `block` with one exact ask — don't invent. Never touch the inbound sync semantics (`lib/crm/twenty-mapping.ts` field maps).
