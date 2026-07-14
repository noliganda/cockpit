# Cockpit — Contacts / CRM Split — Spec

**Status:** draft (decision D2 pending — see Open Questions)
**Owner:** dev/cockpit session (dispatched by PM session; Cockpit task to be created at dispatch)
**Brief:** Oli, 2026-07-15 — the Contacts section still carries the pre-Twenty custom CRM (pipeline board, organisations). Strip it to a pure Rolodex, and add a NEW, fully independent CRM section backed by Twenty.
**Companion spec:** `dev/crm/SPEC-2026-07-15-enrichment-signals-d365.md` (the data plane). This spec is the **view plane**.
**Last updated:** 2026-07-15

## Scope

**In:** route/label split · Rolodex cleanup (remove old custom CRM) · new read-only CRM section fed by a Twenty→Neon projection.
**Out:** any CRM data logic (enrichment, signals, D365 — data-plane spec) · write-back actions from the CRM section (explicitly deferred to v2, see D2) · changes to the Twenty sync itself (KEEP as-is).

**The naming trap this fixes:** today the sidebar item "Contacts" routes to `/crm` (`components/sidebar.tsx:28`) and the palette calls the same page "Go to CRM". One page is both things. After this spec: `/contacts` = Rolodex, `/crm` = the new CRM section, labels match routes.

## Approach

**Phase A — route/label split (do first; it's the rename everything else hangs off).**
Move `app/crm/` → `app/contacts/` (page, client, `[id]`, loading). Sidebar `NAV_ITEMS`: "Contacts" → `/contacts`. Command palette `QUICK_ACTIONS`: repoint. Add a redirect `/crm/[id]` → `/contacts/[id]` for old links until Phase C claims `/crm`. Update `lib/search.ts` / search-overlay references if they carry the route.

**Phase B — Rolodex cleanup (REMOVE the old custom CRM; per PM recon 2026-07-15).**
Remove: Pipeline (Kanban) tab + drag logic (`crm-client.tsx:1092-1192, 531-549, 617-624`) · Organisations tab + dialogs (`:350-514, 973-1090`) · `organisations` table + `app/api/organisations/*` — **only after** a one-off snapshot + reconcile: export all `organisations` rows to a JSON snapshot committed under `docs/archive/`, match by normalized name against Twenty companies (658 exist from ORG mapping), report unmatched to Oli before dropping · `PIPELINE_STAGES` (`types/index.ts:29`) + stray `PipelineStage` type (`:403`) · batch pipeline-stage endpoint (`app/api/contacts/batch/route.ts` PATCH; keep batch DELETE) · `pipelineStage` cell in KORUS metrics (`korus-metrics-client.tsx:238`).
Keep: `contacts` table + CRUD, VCF export (useful Rolodex feature), contact detail page (drop its Pipeline Stage row), dashboard quick-add, `project_contacts` linking.
**DO-NOT-DROP (sync dependency):** `contacts.pipeline_stage`, `next_reach_date`, `source`, `company`, and the `twenty_*`/`vcard_uid` link columns — `lib/crm/twenty-mapping.ts` reads/writes them; dropping breaks the Twenty sync or blanks Twenty custom fields. They simply stop being rendered in the Rolodex UI. Pipeline *ownership* moves to Twenty.

**Phase C — new CRM section at `/crm` (read-only projection, D2 default).**
**Hard constraint:** Cockpit runs on Vercel; Twenty is tailnet-only — pages can NEVER call Twenty at request time (only the inbound webhook direction works). All Twenty reads therefore come from **Neon projection tables fed by the existing Mini worker**: extend `scripts/crm/twenty-worker.ts` reconcile to also pull opportunities, companies, and signal-people (`source="apollo"`) into new read-only tables (`crm_opportunities`, `crm_companies`, `crm_signals`; migration `0015`). 15-min freshness is acceptable for v1; show a "last synced" stamp.
Page content v1: pipeline overview (from person `pipelineStage` and/or opportunities by stage) · next-reach list (`nextReachDate` ascending) · signals inbox (new `source="apollo"` records, by list) · opportunities list with D365-export status (once data-plane Phase D exists). Every card/row **deep-links into the Twenty UI** (`https://agentsmyth-mac.tail9f7939.ts.net:8443/...`) — editing happens in Twenty; Cockpit does not grow a second CRM editor (that is how the old custom CRM happened).
Register the section: `NAV_ITEMS` + `QUICK_ACTIONS` ("Go to CRM" → new `/crm`), scaffold per the Sprints pattern (`app/sprints/page.tsx`).

**Phase D (v2, out of scope now):** write actions (quick stage change, snooze next-reach) via a queued write-back the Mini worker pushes to Twenty.

## Milestones

| # | Milestone | Owner | Evidence |
|---|-----------|-------|----------|
| 1 | `/contacts` live, labels/route consistent, old links redirect | dev/cockpit | deploy URL + click-through |
| 2 | Rolodex clean: no pipeline/orgs UI; orgs snapshot committed; unmatched-orgs report to Oli | dev/cockpit | commit + snapshot file + report |
| 3 | Projection tables filling from Mini worker | dev/cockpit | row counts vs Twenty; worker log |
| 4 | `/crm` section live with the four v1 blocks + deep-links | dev/cockpit | deploy URL + screenshot |

## Acceptance Criteria

- [ ] Sidebar/palette: "Contacts"→`/contacts`, "CRM"→`/crm`; no route serves both concepts.
- [ ] Rolodex renders zero pipeline/organisation UI; contact create/edit/delete + VCF export + project linking still work.
- [ ] Twenty sync unbroken after cleanup: worker run shows inbound+outbound OK; editing a linked contact in Cockpit still updates Twenty (and vice versa).
- [ ] `organisations` table dropped ONLY after snapshot committed + unmatched report acknowledged by Oli.
- [ ] `/crm` renders from Neon only (zero runtime calls toward tailnet); shows last-synced stamp; deep-links open the right Twenty record.
- [ ] Build/lint/tests green on main; each phase = its own commit(s).

## Dependencies & Inputs

- Data-plane spec Phases A–C for `contactGroups`, `signalList`, `source` semantics and opportunity usage — **coordinate field names before building projection** (they are camelCase in Twenty).
- Existing KEEP infrastructure: `lib/crm/twenty-mapping.ts`, `lib/crm/twenty-sync.ts`, webhook route, Mini worker + launchd (`com.noliganda.cockpit-twenty-sync.plist`).
- `docs/current/integrations/twenty-crm-sync.md` — update it in Phase C (projection is a new consumer).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dropping shared columns breaks Twenty sync | High if careless | Sync churn / blanked fields | DO-NOT-DROP list above; acceptance test on sync round-trip |
| Org rows lost that Twenty doesn't have | Medium | Data loss | Snapshot + reconcile + Oli-acknowledged report BEFORE drop |
| Projection drifts from Twenty | Low | Stale UI | Worker cadence 15 min + last-synced stamp; reconcile is idempotent |
| Route rename breaks muscle memory/bookmarks | Low | Annoyance | Redirects in Phase A |

## Open Questions

- **D2 — CRM section shape:** v1 read-only projection + deep-links to Twenty (recommended; Vercel↔tailnet constraint makes live CRUD expensive), or full CRUD in Cockpit (requires write-back queue — v2 material)?

---

## For Agents

This spec is the contract. Build to it, one phase per Cockpit task, commit straight to main, evidence per milestone. If a question comes up that's not covered, `block` with one exact ask — don't invent. Never touch `lib/crm/*` sync semantics without flagging the PM.
