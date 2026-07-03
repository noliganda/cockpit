# Docs Index — Cockpit

This repo contains a mix of **current architecture**, **historical version docs**, **reference material**, and **archived experiments**.

---

## Read first

### Current architecture
- `current/architecture/OPS-V5-TASK-HIERARCHY-DECISION-NOTE.md`
- `current/architecture/OPS-V5-INTAKE-ROUTING-AND-EXECUTION-MODEL.md`
- `current/architecture/OPS-V5-ROLLOUT-PLAN-CHARLIE-DEVON-CLAUDE.md`
- `current/architecture/OPS-V5-TASK-OWNERSHIP-AND-EXECUTION-PLAN.md`
- `current/architecture/COCKPIT-DISPATCH-ENGINE-SPEC.md` — dispatch engine + dependency cascade (draft, 2026-06-30)
- `current/architecture/COCKPIT-MESSAGES-SECTION-SPEC.md` — Messages section + Brief/Home utilization, fed by the Email PA (handoff draft, 2026-07-03)

These are the current source-of-truth docs for **Cockpit / OPS v5**.

---

## Sections

### `current/`
Current active build direction.

### `journal/`
Project journal migrated in-repo from the old OM `projects/cockpit/` folder — briefs, ideation, and dated session handoff logs. Read the newest-dated file first for the latest working context and next steps.
- `brief.md` — what Cockpit is / project brief
- `YYYY-MM-DD-*.md` — dated handoff & daily logs

### `versions/`
Historical product-generation docs kept for reference.
- `versions/v4-ops-dashboard/` = Ops Dashboard v4 specs and phase docs

### `reference/`
Live supporting material, not architecture:
- `PHASE-2A-HARNESS.md` — harness phase notes
- `CODEX-TASK-QUEUE.md` — Codex/agent task queue (note: task system has since pivoted — verify before relying on it)
- `audits/ENV_AUDIT.md` — environment-variable audit

### `archive/`
Historical or obsolete materials that should not drive current decisions — dated status/audit snapshots (`STATUS-2026-03-04`, `AUDIT-2026-03-04`, `AUDIT_REPORT`), raw drafts (`PHASE-2A-HARNESS.original.md`), and old tooling.

---

## Working rule
- Use `current/` for present-tense decisions
- Use `reference/` for live supporting material (audits, queues, phase notes)
- Use `versions/` for historical product understanding
- Use `archive/` only when tracing older thinking
- For the task-system rebuild, treat the task hierarchy decision note plus the task ownership/execution docs as the canonical source of truth
