# OPS v5 — Agents & Operators Page Spec

**Date:** 2026-03-31  
**Status:** Spec for next build — replace current sloppy version  
**Purpose:** Design a polished, information-dense Agents & Operators management surface in Cockpit

---

# 1. Goals

The agents page should feel like a **mission control panel** for the agent team, not a plain table.

It should answer at a glance:
- Who's active, who's paused?
- What are they working on right now?
- How much of their monthly budget is left?
- When did they last run?
- What are their heartbeats?

And on each individual agent page:
- Full profile + capabilities
- Budget history
- Task history (completed, in progress, blocked)
- Heartbeat schedule (from OpenClaw)
- Wakeup request log
- Activity feed

---

# 2. Page structure

## `/settings/agents` — Team overview

### Header
- Title: **"Agent Team"**
- Subtitle: Active agents count + total monthly budget + total spend this month

### Stats bar (4 cards)
```
[ 🟢 Active: 5 ]  [ 💰 Budget: $1,020 ]  [ 💸 Spent: $0.00 ]  [ 📋 Queue: 0 tasks ]
```

### Agent cards grid (not a table)

Each agent gets a **card**, not a row. Inspired by Paperclip's agent dashboards.

#### Agent card layout
```
┌─────────────────────────────────────────────────────┐
│  🤖 Devon                           [ ● Active ]     │
│  Engineering & Product                               │
│  ──────────────────────────────────────────────────  │
│  Area: Engineering    Adapter: Codex                 │
│  Last run: 2h ago     Queue: 0 tasks                 │
│  ──────────────────────────────────────────────────  │
│  Budget: ████████░░  $4.20 / $100.00                 │
│  ──────────────────────────────────────────────────  │
│  [ View Profile ]    [ Pause ]                        │
└─────────────────────────────────────────────────────┘
```

**Card fields:**
- Name + type icon (🤖 agent / 🧑 human)
- Role subtitle
- Status badge (Active / Paused / Idle)
- Primary area
- Adapter type (codex / claude-code / openclaw / manual)
- Last heartbeat (human-readable: "2h ago", "Never")
- Queue depth (tasks waiting)
- Budget gauge bar: colored progress bar with dollar amounts
  - Green < 70%, Yellow 70-90%, Red > 90%
- Two buttons: View Profile / Pause (or Resume)

---

## `/settings/agents/[id]` — Individual agent page

Tabs: **Overview | Tasks | Heartbeats | Budget | Activity**

---

### Tab 1: Overview

**Left column — Profile**
- Name, role, type badge
- Status (active/paused) with toggle + pause reason if paused
- Primary area (linked)
- Adapter type
- Workspace scope (which workspaces they can touch)
- Capabilities (tag chips)
- Supervisor (linked operator)
- Created date

**Right column — Live status**
- Current task (if any): task title + status + link
- Queue depth
- Last heartbeat timestamp
- Last wakeup request result

---

### Tab 2: Tasks

Table of tasks assigned to this agent, filterable by status.

Columns: Title | Status | Priority | Area | Project | Due | Last updated

Filters: Active | Done | Blocked | All

Shows subtask indicator if task has children.

---

### Tab 3: Heartbeats

This is the reference view Oli asked for — "what heartbeat is attributed to which agent."

Since heartbeats live in OpenClaw, this page doesn't manage them — it just **displays them for context.**

Display format:
```
Heartbeat schedule (from OpenClaw crons)
──────────────────────────────────────────
🕐  Every 30 min, 9am–6pm  →  Check inbox + task queue
🕑  Daily 7am               →  Morning brief
🕒  Daily 9am               →  Work block execution
```

Source: OpenClaw cron list, filtered by agent ID / name pattern.

**Important note on the page:** "Heartbeat schedules are managed in OpenClaw. This view is read-only reference."

If no heartbeat data available: show a note explaining how to set one up in OpenClaw.

---

### Tab 4: Budget

**Current month**
- Budget: $100.00
- Spent: $4.20
- Remaining: $95.80
- Progress bar (colored by %)
- Days remaining in month

**Settings (editable)**
- Monthly budget (inline number input + save)
- Warning threshold %
- Hard stop toggle

**Spend history (last 30 days)**
- Simple bar chart or day-by-day list
- Token count if available

---

### Tab 5: Activity

Feed of recent activity_log events for this operator.

Columns: Time | Event | Entity | Status | Source

Filters: All | Task | Wakeup | Error

---

# 3. Design tokens to use

Match existing Cockpit dark UI:
- Background: `#0F0F0F` / `#141414`
- Cards: `#141414` border `rgba(255,255,255,0.07)`
- Text primary: `#F5F5F5`
- Text secondary: `#A0A0A0`
- Text muted: `#6B7280`

**Status colors:**
- Active: `#22C55E` (green)
- Paused: `#F59E0B` (amber)
- Idle: `#6B7280` (grey)

**Budget bar colors:**
- Under 70%: `#2A9D8F` (teal)
- 70–90%: `#F59E0B` (amber)
- Over 90%: `#E63946` (red)

**Type icons:**
- 🤖 Agent
- 🧑 Human

---

# 4. UX rules

1. **Cards, not table rows** on the overview page. Feels like a team, not a spreadsheet.
2. **Status-first layout** — the most important info (active/paused, budget health, last run) should be immediately visible without clicking.
3. **Agent detail page is deep** — clicking into an agent reveals everything about that operator.
4. **Heartbeats are read-only reference** — don't create a confusing parallel management UI. OpenClaw manages heartbeats. Cockpit just shows them.
5. **Budget gauge is prominent** — cost visibility is a core reason this page exists.
6. **Empty states are helpful** — if no tasks, no heartbeats, no budget spend: show "No tasks yet. Assign one from the Tasks view." etc.

---

# 5. API requirements

## Existing
- `GET /api/operators` — list all operators ✅
- `PATCH /api/operators/[id]` — update status/budget ✅

## New needed
- `GET /api/operators/[id]` — single operator detail (add if not already exists)
- `GET /api/operators/[id]/tasks` — tasks assigned to this operator
- `GET /api/operators/[id]/activity` — activity log events for this operator
- `GET /api/operators/[id]/budget` — current spend summary (from activity_log.apiCostUsd)
- `GET /api/crons?operatorId=devon` — read OpenClaw cron list filtered by agent (read-only)

---

# 6. Build order

1. **Replace overview `/settings/agents` with card grid** (not table)
2. **Add `/settings/agents/[id]` detail page** with Overview + Tasks tabs (MVP)
3. **Add Heartbeats tab** with OpenClaw cron data
4. **Add Budget tab** with editable settings
5. **Add Activity tab**

MVP = tabs 1 + 2. Ship the rest after.

---

# 7. Key difference from current version

| Current (sloppy) | Target (polished) |
|------------------|-------------------|
| Plain table rows | Agent cards with budget gauge + status |
| No individual pages | Full `/settings/agents/[id]` with tabs |
| No task context | Tasks tab showing assigned work |
| No heartbeat reference | Heartbeats tab (read-only from OpenClaw) |
| No budget history | Budget tab with spend + settings |
| No activity | Activity tab |
| Generic empty state | Helpful agent-specific empty states |

---

# 8. One-line summary

> The Agents page should feel like a control panel for your AI team — status at a glance, full detail on click, budget always visible, heartbeats always accessible.
