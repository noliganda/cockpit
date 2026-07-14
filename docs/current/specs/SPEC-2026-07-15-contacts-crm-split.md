# Cockpit — Contacts Rolodex Cleanup (old custom CRM removal) — Spec

**Status:** active (all decisions resolved by Oli 2026-07-15)
**Owner:** dev/cockpit session (dispatched by PM session; Cockpit task to be created at dispatch)
**Brief:** Oli, 2026-07-15 — the Contacts section still carries the pre-Twenty custom CRM (pipeline board, organisations). Strip it to a pure Rolodex. **Descope decision (Oli, same day): Twenty stays entirely separate from Cockpit — no new CRM section, no projection.** Twenty's own UI (tailnet `:8443`) is the CRM UI.
**Companion spec:** `dev/crm/SPEC-2026-07-15-enrichment-signals-d365.md` (the CRM data plane — enrichment/signals happen in Twenty, not here).
**Last updated:** 2026-07-15

## Scope

**In:** route/label fix (`/crm` → `/contacts`) · Rolodex cleanup — remove every old-custom-CRM surface (pipeline board, organisations, stage batch-ops) from UI, API, and schema (with snapshot safeguards).
**Out:** any new CRM section in Cockpit (descoped — Oli 2026-07-15) · Twenty→Neon projections · changes to the existing Twenty person sync (**KEEP, untouched** — it is what keeps the Rolodex aligned with Baïkal via Twenty; if Oli ever wants Twenty *fully* unplugged from Cockpit, that is a separate explicit decision, not this spec) · enrichment/signals/D365 (data-plane spec).

**The naming trap this fixes:** today the sidebar item "Contacts" routes to `/crm` (`components/sidebar.tsx:28`) and the palette calls the same page "Go to CRM". After this spec: `/contacts` = the Rolodex; **no `/crm` route exists in Cockpit at all** — CRM lives in Twenty.

## Approach

**Phase A — route/label fix.**
Move `app/crm/` → `app/contacts/` (page, client, `[id]`, loading). Sidebar `NAV_ITEMS`: "Contacts" → `/contacts`. Command palette `QUICK_ACTIONS`: "Go to CRM" → "Go to Contacts" (`/contacts`). Redirect `/crm` and `/crm/[id]` → `/contacts` equivalents (bookmarks/muscle memory). Update `lib/search.ts` / `components/search-overlay.tsx` if they carry the route.

**Phase B — Rolodex cleanup (REMOVE the old custom CRM; per PM recon 2026-07-15).**
Remove:
- Pipeline (Kanban) tab + drag logic — `crm-client.tsx:1092-1192, 531-549, 617-624`
- Organisations tab + dialogs — `crm-client.tsx:350-514, 973-1090`
- `organisations` table + `app/api/organisations/*` — **only after** a one-off snapshot + reconcile: export all `organisations` rows to a JSON snapshot committed under `docs/archive/`, match by normalized name against Twenty companies (658 exist from ORG mapping), report unmatched entries to Oli **before** dropping
- `PIPELINE_STAGES` (`types/index.ts:29`) + stray `PipelineStage` type (`:403`)
- Batch pipeline-stage endpoint (`app/api/contacts/batch/route.ts` PATCH; keep batch DELETE)
- Pipeline Stage row on the contact detail page; `pipelineStage` cell in KORUS metrics (`korus-metrics-client.tsx:238`)

Keep: `contacts` table + CRUD · VCF export (useful Rolodex feature) · dashboard quick-add · `project_contacts` linking · **the entire Twenty sync** (`lib/crm/twenty-mapping.ts`, `lib/crm/twenty-sync.ts`, `app/api/crm/webhooks/twenty/route.ts` — the webhook route path may stay as-is; it's an API surface, not UI) · Mini worker + launchd.

**DO-NOT-DROP (sync dependency):** `contacts.pipeline_stage`, `next_reach_date`, `source`, `company`, and the `twenty_*`/`vcard_uid` link columns — `lib/crm/twenty-mapping.ts` reads/writes them; dropping breaks the Twenty sync or blanks Twenty custom fields. They simply stop being rendered in the Rolodex UI. Pipeline *ownership* moves to Twenty.

## Milestones

| # | Milestone | Owner | Evidence |
|---|-----------|-------|----------|
| 1 | `/contacts` live, labels/routes consistent, old `/crm` links redirect | dev/cockpit | deploy URL + click-through |
| 2 | Rolodex clean: no pipeline/orgs UI; orgs snapshot committed; unmatched-orgs report to Oli | dev/cockpit | commit + snapshot file + report |
| 3 | `organisations` table + API dropped after Oli acknowledges the report | dev/cockpit | migration commit |

## Acceptance Criteria

- [ ] Sidebar/palette say "Contacts" and point at `/contacts`; no Cockpit route or nav item says "CRM".
- [ ] Rolodex renders zero pipeline/organisation UI; contact create/edit/delete + VCF export + project linking still work.
- [ ] Twenty sync unbroken after cleanup: a worker run shows inbound+outbound OK; editing a linked contact in Cockpit still updates Twenty (and vice versa).
- [ ] `organisations` dropped ONLY after snapshot committed + unmatched report acknowledged by Oli.
- [ ] Build/lint green on main; each phase = its own commit(s).

## Dependencies & Inputs

- PM recon report 2026-07-15 (file/line inventory above) — the KEEP/REMOVE map.
- `docs/current/integrations/twenty-crm-sync.md` — the sync contract this spec must not break; update its "UI" references from `/crm` to `/contacts`.
- Twenty companies list (for the org reconcile) — read via the Mini worker's client or a one-off script on the Mini (Twenty is tailnet-only; Vercel can't reach it).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dropping shared columns breaks Twenty sync | High if careless | Sync churn / blanked Twenty fields | DO-NOT-DROP list; acceptance test on sync round-trip |
| Org rows lost that Twenty doesn't have | Medium | Data loss | Snapshot + reconcile + Oli-acknowledged report BEFORE drop |
| Route rename breaks bookmarks/integrations | Low | Annoyance | Redirects in Phase A; grep repo for hardcoded `/crm` links |

## Open Questions

None — resolved by Oli, 2026-07-15: **D2 = no CRM section in Cockpit**; Twenty stays entirely separate (its UI is the CRM). The existing person sync stays (it feeds the Rolodex); unplugging it would be a new, explicit decision.

---

## For Agents

This spec is the contract. Build to it, one phase per Cockpit task, commit straight to main, evidence per milestone. If a question comes up that's not covered, `block` with one exact ask — don't invent. Never touch `lib/crm/*` sync semantics.
