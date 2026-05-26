# Cockpit (OPS v5) — Brief

**Status:** in development (per Oli Bible — implementation underway)
**Canonical local path:** `~/workspaces/om/projects/cockpit/`
**Project lead:** Olivier (with Claude Code / CMUX as the implementation environment)

## What Cockpit Is

Cockpit (formal name **OPS v5**, casual name **Cockpit**) is Oli's unified operational event spine. It is the audit/control layer for the agent-driven operating system that runs across all three businesses (Byron Film, KORUS, personal brand).

Per the Oli Bible (`~/Documents/oli-bible-from-openclaw.md`, section 7):
- **Database:** Neon Postgres
- **Canonical event spine:** `activity_log`
- **Architecture:** unified operational event spine for logging, reporting, and agent telemetry
- **Implementation:** Claude Code in CMUX as the architect/orchestrator/reviewer

## Role in the Stack

| Component | Role |
|-----------|------|
| Hermes | Runtime / front door |
| **Cockpit** | **Audit / control / event spine** |
| Workspace Blueprint | Scoped agent workspaces (the `~/workspaces/*` workspaces) |
| Supermemory | Context layer (planned) |
| CLI Printing Press | Tool factory (skill) |
| Claude Code | Interactive interface |

## Why It Matters

The Bible's framing: agents like Charlie, Devon, Hunter, Finn etc. (legacy specialists) or Hermes (current runtime) need an audit trail. When agents do things on Oli's behalf — even drafted, awaiting approval — the *what / when / why* needs to be queryable.

Cockpit's `activity_log` is the queryable record. It enables:
- Knowing what agents have done across all three businesses
- Reporting / dashboards across business contexts
- Telemetry that informs which agent prompts/skills work and which don't
- An audit trail for the working agreement (Oli reviews and commits; agents draft)

## Current State (Needs Verification)

Per the Bible, this is "current direction" — implementation status as of bible generation (2026-05-13) is not explicitly stated. Confirm with Oli or Hermes:
- [ ] Is `activity_log` schema defined?
- [ ] Is Neon Postgres provisioned and connected?
- [ ] Are any agents currently writing to `activity_log`?
- [ ] Are any dashboards / queries built?

## Repository

This folder is the canonical local path. If the actual code lives in a separate Git repo (e.g. `noliganda/ops-dashboard` per Bible — "later reframed as OPS v5 / Cockpit"), reference it here. Suggested structure if/when developed:

```
cockpit/
├── brief.md         ← You are here
├── README.md        ← How to run / develop
├── src/             ← Source code
├── db/              ← Schema, migrations
├── docs/            ← Architecture, schema docs
└── scripts/         ← Dev/ops scripts
```

## Open Questions

1. **Is the code currently in a separate repo?** If yes, link it here. If no, plan to develop in this folder.
2. **Cross-workspace coupling:** Cockpit serves Byron Film, KORUS, and personal brand. Should the `~/workspaces/bf/`, `~/workspaces/korus/`, and `~/workspaces/om/` workspaces have any direct integration / config pointing at Cockpit? Or is the coupling purely via Hermes / agent runtime?
3. **Secrets / connection strings:** Neon Postgres credentials. Where do they live? (Not in this repo — `.env` and password manager.)
4. **Schema status:** Has `activity_log` been designed? If not, that's the first build task.

## Memory Reference

- `~/.claude/projects/-/memory/reference_agent_stack.md` — Oli's full agent stack overview
- `~/Documents/oli-bible-from-openclaw.md` — the source document (sections 7, 9)

---

## Next Action

Confirm current implementation status with Oli or Hermes. If pre-implementation: design the `activity_log` schema and provision Neon. If implementation underway: link to wherever the code currently lives.
