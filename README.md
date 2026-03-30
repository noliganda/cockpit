# Cockpit — Repo Index

**Current product direction:** **OPS v5 — Cockpit**  
**Historical repo/package lineage:** Charlie Dashboard → Ops Dashboard → Cockpit  
**Current codebase path:** `olivier-marcolin/projects/cockpit/`

---

## Read This First

### Current / active architecture docs
- `docs/current/architecture/OPS-V5-TASK-HIERARCHY-DECISION-NOTE.md`
- `docs/current/architecture/OPS-V5-INTAKE-ROUTING-AND-EXECUTION-MODEL.md`
- `docs/current/architecture/OPS-V5-ROLLOUT-PLAN-CHARLIE-DEVON-CLAUDE.md`
- `docs/current/architecture/OPS-V5-TASK-OWNERSHIP-AND-EXECUTION-PLAN.md`
- `docs/INDEX.md`

These are the current source-of-truth docs for Cockpit direction.

---

## Repo Structure

### Runtime / development folders
- `app/` — Next.js app routes, pages, API routes
- `components/` — reusable UI components
- `hooks/` — React hooks / frontend behaviour
- `lib/` — business logic, auth, DB, search, integrations, utilities
- `drizzle/` — database migrations
- `scripts/` — setup / seed / helper scripts
- `types/` — shared TypeScript types

### Documentation folders
- `docs/current/` — current Cockpit architecture and live build direction
- `docs/versions/v4-ops-dashboard/` — v4 phase + spec docs retained for reference
- `docs/reference/` — audits, status notes, other supporting docs
- `docs/archive/` — historical/obsolete materials that should not drive current decisions
- `docs/INDEX.md` — quick map of the documentation set

---

## Version History (working model)
- **V1** — Charlie Dashboard
- **V2–V4** — Ops Dashboard
- **V5** — Cockpit

---

## Current Build Direction

The current task-system rebuild direction assumes:
- Cockpit is the operational source of truth
- `activity_log` is the canonical event spine
- parent tasks are the main prioritisation and review objects
- subtasks are execution objects beneath parents
- schema may support generic nesting, but v1 product behavior should strongly bias to a practical parent/subtask model
- task UI should support parent-first views with expand/collapse toggles for child tasks
- the existing prioritisation workflow based on importance, urgency, effort, impact, and project context should be preserved

---

## Guidance
- Treat `docs/current/architecture/` as the current build direction
- Treat `docs/versions/v4-ops-dashboard/` as historical reference, not current architecture
- Treat `docs/archive/` as historical context only
- Keep repo root focused on code/runtime files plus this index and `CLAUDE.md`
