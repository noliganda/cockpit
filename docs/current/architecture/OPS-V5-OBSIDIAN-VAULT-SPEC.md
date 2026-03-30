# OPS v5 — Obsidian Vault Backup Spec

**Date:** 2026-03-30  
**Status:** Spec for next Codex run  
**Purpose:** Define the complete Cockpit → Obsidian export structure to replace the stale OpsOS vault

---

# 1. Vault location

```
~/Library/Mobile Documents/com~apple~CloudDocs/Cockpit/
```

The vault was renamed from `OpsOS` to `Cockpit` by Oli.
The code currently points to `OpsOS` — this must be corrected.

---

# 2. Folder structure

```
Cockpit/
├── Tasks/           — all tasks as .md files
├── Projects/        — project summaries
├── Areas/           — area descriptions + linked operators
├── Contacts/        — contact records
├── Notes/           — notes linked to projects/areas
├── Bases/           — reference data (workspaces, operators, budgets)
├── Activity/        — daily logs from activity_log (one file per day)
└── Agents/          — operator profiles + budget status + recent sessions
```

---

# 3. Per-folder content spec

## Tasks/
One `.md` per task.

Frontmatter:
```yaml
---
id: "uuid"
title: "Task title"
status: "In Progress"
priority: "medium"
urgent: false
important: true
due_date: "2026-04-01"
workspace_id: "byron-film"
project_id: "uuid"
area_id: "uuid"
assignee_id: "devon"
assignee_name: "Devon"
assignee_type: "agent"
parent_task_id: null
created_at: "2026-03-30T..."
---
```

Body:
```markdown
# Task title

{task.description}

## Subtasks
- [ ] Subtask 1
- [x] Subtask 2 (done)
```

---

## Projects/
One `.md` per project.

Frontmatter: id, name, status, workspace, area, start/end dates, budget

Body: project description + list of linked tasks

---

## Areas/
One `.md` per area.

Frontmatter: id, name, workspace, color, icon

Body: context + spheres of responsibility + linked operator + active projects

---

## Contacts/
One `.md` per contact.

Frontmatter: id, name, email, phone, company, pipeline_stage, tags, next_reach_date

Body: notes field

---

## Notes/
One `.md` per note.

Frontmatter: id, title, project_id, area_id, pinned, tags

Body: note content (plaintext version)

---

## Bases/
Reference snapshots:

`workspaces.md` — all workspaces with their slugs and colors

`operators.md` — all operators with role, status, budget (spent / monthly limit)

---

## Activity/{date}.md
One file per day of activity_log events.

Format:
```markdown
# Activity — 2026-03-30

## Summary
- 47 events
- 12 tasks updated
- 3 agents active

## Events

### 10:24 — intake_task_created
**Actor:** charlie (agent)
**Task:** Build hierarchy schema
**Source:** slack / #om-cockpit-dev

...
```

---

## Agents/
One `.md` per operator.

Frontmatter: id, name, role, status, primary_area, budget_monthly_cents, spent_monthly_cents

Body:
- Capabilities
- Budget status (bar-style text: ████░░░░ 40% of $200/mo)
- Current queue (list of queued tasks)
- Recent completions (last 5)

---

# 4. Implementation notes

## What to fix in lib/obsidian-export.ts
- Change `OpsOS` → `Cockpit` in vault path
- Export tasks, projects, areas, contacts, notes, bases, activity, agents
- Use atomic write pattern (write to temp, then rename) to avoid partial states
- Log export summary to activity_log

## Daily cron
Add to `vercel.json`:
```json
{
  "path": "/api/cron/obsidian-backup",
  "schedule": "0 2 * * *"
}
```
Runs at 2am daily — after embed-backfill.

## One-time wipe
On first run: wipe the entire vault and rebuild from scratch since existing content is stale.

## Settings UI
Keep the existing "Backup to Obsidian" button in Settings.
Update it to show: last backup timestamp, number of files exported.

---

# 5. Build order

1. Fix vault path in `lib/obsidian-export.ts`
2. Extend export to cover all 8 folder types
3. Create `app/api/cron/obsidian-backup/route.ts`
4. Add to `vercel.json` cron schedule
5. Update Settings UI to show last backup stats
6. Wipe vault and run first fresh backup

---

# 6. One-line summary

> Daily snapshot: Cockpit DB → Obsidian vault as plain markdown, preserving everything for offline browsing, search, and backup.
