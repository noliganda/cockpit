# OPS DASHBOARD — MASTER SPECIFICATION

*Unified Specification — 2026-03-05*
*Compiled from: SPEC v4.0 + Phases 6–10*
*Design System: `.interface-design/system.md`*

---

## META

| Field | Value |
|-------|-------|
| Product | Ops Dashboard |
| Owner | Olivier Marcolin (Oli) |
| Operator | Charlie (AI assistant) |
| URL | dashboard.oliviermarcolin.com |
| Repo | github.com/noliganda/charlie-dashboard |
| DB | Neon Postgres + pgvector (ap-southeast-2) |
| Deploy | Vercel (Hobby plan) |
| Stack | Next.js 15, TypeScript, Tailwind v4, Drizzle ORM, shadcn/ui |

---

# 1. PROBLEM STATEMENT

Olivier Marcolin runs two businesses from Byron Bay:
- **Byron Film** — Boutique video production ($250K → $500K target 2026)
- **KORUS Group** — Premium commercial fit-out (expanding AU/SG)
- Plus a **Personal** workspace for life admin + the Charlie AI partnership.

The dashboard replaces Notion as the single source of truth. It's both a **human interface** (Oli on phone/iPad/desktop between calls) and an **API layer** for Charlie's autonomous operations.

### What It Must Do
1. **Task management** — CRUD, prioritize (Eisenhower), workspace-specific workflows
2. **Project tracking** — Progress, linked tasks, milestones, budgets, contacts, bookmarks
3. **CRM** — Contacts, organisations, pipeline kanban
4. **Sprint execution** — Time-boxed blocks with kanban + burndown
5. **Rich notes** — BlockNote block editor (like Notion)
6. **Bases** — User-created custom databases/tables (spreadsheet-like)
7. **KORUS APAC metrics** — Executive dashboard with guest access for the board
8. **Productivity metrics** — AI ROI, cost efficiency, action tracking
9. **Semantic search** — Full-text + vector search across all data
10. **AI chat** — Talk to Charlie from the dashboard (text, voice, camera, images)
11. **Calendar** — Integrated calendar view
12. **Activity logging** — Every action recorded with vector embeddings
13. **Data ownership** — All data in one Postgres DB. `pg_dump` captures everything.

### What It Is NOT
- NOT a marketing site, NOT multi-tenant SaaS, NOT a Notion clone, NOT a coding demo

### Context for Agents
- Notion SDK v5: auto-detect title properties via schema retrieval
- Status options differ per workspace DB — query valid options before mapping
- Vercel Hobby: cron jobs must be daily frequency only
- Single `app/` directory at root (NOT `src/app/`)
- `region` is KORUS-only — never show on Byron Film or Personal
- pgvector extension already enabled on Neon DB
- OpenClaw Gateway at `ws://localhost:18789` for chat widget

---

# 2. ACCEPTANCE CRITERIA

The build is complete when ALL of the following can be verified:

### Core Function
- [ ] All pages render without errors at 375px, 768px, 1440px
- [ ] Creating a task persists to Postgres and survives refresh
- [ ] Switching workspaces filters all data and updates accent colors
- [ ] Kanban drag-and-drop updates status via API
- [ ] Notion sync pulls from all 3 DBs and upserts with correct status mapping
- [ ] Activity feed shows last 20 actions

### Rich Features
- [ ] Notes: BlockNote editor with slash commands, drag handles, dark theme
- [ ] Bases: Create custom tables, inline editing, column management, CSV export
- [ ] Semantic search returns relevant results for natural language queries
- [ ] Chat widget connects to Gateway — text, image upload, voice, camera all work
- [ ] KORUS APAC metrics: all 11 sections with real data, separate guest auth
- [ ] Productivity metrics: 7 sections, cost calculator, ROI stats
- [ ] Calendar view with events from tasks/milestones

### Data Integrity
- [ ] Every mutation writes to `activity_log`
- [ ] Embeddings generated async (non-blocking)
- [ ] Notion sync is idempotent — no duplicates

### Auth
- [ ] Main dashboard: password auth, 7-day cookie
- [ ] KORUS metrics: separate guest auth, 24h cookie
- [ ] User roles: Admin (full), Collaborator (CRUD, no settings), Guest (view-only)
- [ ] All API routes enforce role-based access

### Build Quality
- [ ] `npm run build` passes with ZERO errors
- [ ] No `any` in business logic
- [ ] No hardcoded Notion property names
- [ ] No localStorage for business data

---

# 3. CONSTRAINTS

### MUST DO
- Single Postgres (Neon) via Drizzle ORM for ALL data including vectors
- Next.js 15 App Router, single `app/` directory
- Server Components for data fetching, Client Components only for interactivity
- Every entity has `workspaceId`; every mutation writes to `activity_log`
- Embedding generation is async and non-blocking
- Dark theme ONLY per `.interface-design/system.md`
- Mobile + iPad responsive (375px, 768px, 1440px)
- Sidebar bg = canvas bg (#0F0F0F), borders = rgba, text = #F5F5F5 (not white)

### MUST NOT
- ❌ localStorage for business data
- ❌ Files in `src/`
- ❌ Supabase, Firebase, or second DB
- ❌ Old Notion REST API (always SDK v5)
- ❌ Hardcoded Notion property names
- ❌ `any` type in business logic
- ❌ `region` outside KORUS workspace
- ❌ Native `<select>` or `<input type="date">`
- ❌ Pure white (#FFFFFF) for text
- ❌ Shadows (borders-only depth model)

### Libraries
Tailwind v4 + shadcn/ui, Framer Motion, Lucide React, BlockNote, @hello-pangea/dnd, Recharts, date-fns, Zod, @notionhq/client v5, TanStack Table (for Bases)

---

# 4. BUILD PHASES — STATUS TRACKER

## Phase 1–5: Foundation Build ✅ COMPLETE
Initial v4 scaffold: schema, API layer, layout/auth/nav, all core pages, integrations, polish.

---

## Phase 6: Deep Implementation ✅ COMPLETE
BlockNote editor, region property (KORUS-only), Notion sync v5, chat widget architecture, KORUS APAC metrics (11 sections), CRM pipeline kanban, sprint burndown, semantic search, mobile responsive pass, UI polish.

---

## Phase 7: Oli Feedback Round 1 ✅ COMPLETE
Urgent/Important checkboxes + Eisenhower matrix, user roles (Admin/Collaborator/Guest), full CRUD for Areas/Projects/Tasks, Bases/Tables feature (custom databases), Obsidian backup button, sidebar nav completion.

---

## Phase 8: Oli Feedback Round 2 — UX Fixes ✅ COMPLETE

### 8.1 Notes: "/" Key Conflict
- "/" must NOT trigger command palette when focus is in BlockNote editor or any input/textarea/contenteditable
- Cmd+K always works regardless of focus

### 8.2 Settings: Username Input Loses Focus
- Extract user creation form to own component
- Stable keys, no parent re-mount on keystroke

### 8.3 Tasks: Universal Status Dropdown
Task statuses are universal (NOT workspace-specific pipeline stages):
- Backlog → To Do → In Progress → Needs Review → Done → Cancelled
- Pipeline stages (Lead, Qualification, Pre-Prod, etc.) are for CRM/projects only

### 8.4 Tasks: Remove Priority Property
- Remove priority dropdown from UI (keep in DB for backwards compat)
- Kanban cards show ⚡/⭐ badges instead of priority dots

### 8.5 Tasks: Kanban "New Task" = Full Dialog
- Both Kanban and List "New Task" buttons open the same `TaskDialog` with ALL fields
- Kanban pre-fills status from column

### 8.6 Tasks: Project OR Area (Not Both)
- Select Project → Area auto-fills from project (read-only)
- No Project → Area dropdown active as fallback

### 8.7 Tasks: All Fields Mandatory on Creation
Required: Title, Status (default Backlog), Workspace, Urgent (default false), Important (default false), Due date, Assignee, Project OR Area, Tags (at least one)

### 8.8 Tasks: Description = BlockNote Editor
- Replace textarea with embedded BlockNote
- Store as JSONB, generate plaintext for search
- Handle legacy string descriptions gracefully

### 8.9 Projects: Detail Page — All Linked Artifacts
Tabs: Overview, Tasks, Notes, Documents, Bases, Contacts
- Show Area (clickable), description (BlockNote, editable inline)

### 8.10 Projects: Description = BlockNote Editor
- Same as tasks — JSONB storage, inline editing on detail page

---

## Phase 9: Bug Fixes + Core Completion ✅ COMPLETE

### Section A: Critical Bugs

**A1. Workspace Filtering Broken**
- Every page/API must filter by current workspace
- Switching workspace = different data

**A2. Tasks Not Persisting After Refresh**
- Verify POST /api/tasks actually inserts into Postgres
- Page must fetch from API on mount, not just client state

**A3. Region Still Showing in BF & Personal**
- Every "region" UI element wrapped in `workspaceId === 'korus'` conditional

**A4. Task Dialog Field Layout**
```
Row 1: Title (full width)
Row 2: [Status] [Due Date]
Row 3: [Assignee] [Tags]
Row 4: [Project] [Area - disabled if project selected]
Row 5: [⚡ Urgent] [⭐ Important] | [Impact ▼] [Effort ▼]
Row 6: [Region - KORUS only]
Row 7: Description (BlockNote, full width)
```

### Section B: Project & Area Improvements

**B1. Project Creation — New Fields**
- Project Manager (contact dropdown)
- Client (contact dropdown + "New" option)
- Lead Gen (optional contact dropdown)
- Budget allows +/- values
- No start date field (auto from createdAt; use milestones instead)
- New tables: `milestones`, `bookmarks`

**B2. Project Milestones**
- Vertical timeline on Overview tab
- CRUD: title, date, status (pending/done)
- Overdue highlighted red

**B3. Project Contact Address Book ("Team" tab)**
- Contacts with roles (Team, Client, Contractor, Supplier, Consultant)
- VCF download per contact
- Join table: `project_contacts`

**B4. Project Bookmarks/Links**
- Links card on Overview tab
- Title + URL, common presets (Drive, Slack, Frame.io, Xero)

**B5. Area Enhancements**
- Add `context` (Internal/External) and `spheresOfResponsibility` (tags)
- Area detail: Overview, Projects, Tasks, Calendar timeline
- Creation dialog: name, description, context toggle, spheres tags, workspace, color, icon

### Section C: Sprint & CRM Completion

**C1. Sprint Creation Dialog**
- Name, Start Date, Due Date, Goal, Workspace

**C2. Sprint Detail / Burndown**
- Left panel: unassigned task list (drag into sprint)
- Right panel: kanban (To Do | In Progress | Done) + burndown chart (Recharts)

**C3. Rename "CRM" → "Contacts"**

**C4. Contact Creation Dialog**
- First Name, Last Name, Position, Organisation (+New), Mobile, Email, Address, LinkedIn, Instagram, Facebook, Portfolio, Pipeline Stage, Tags, Notes
- Auto-log to activity on creation

**C5. Contacts Page — List/Table View**
- Search bar, columns: Name, Position, Mobile (tel:), Email (mailto:), Website, LinkedIn, Instagram
- Click row → detail page

**C6. Organisation Creation Dialog**
- Name, Industry, Size, Website, Email, Phone, Address, Pipeline Stage, Tags, Notes

**C7. Organisations Page — Card View**
- Search, card layout with linked contacts, pipeline badge

**C8. Pipeline Stages (Universal)**
- Lead → Qualified → Proposal → Signature → Won → Lost → On Hold
- `nextReachDate` field on contacts for follow-up tracking

---

## Phase 10: Calendar, Home Dashboard, Shortcuts ✅ COMPLETE
Calendar view, Slack links, home dashboard improvements, keyboard shortcuts, mobile polish, loading states.

---

## Blocks 1–4: Batch Improvements ✅ COMPLETE
- Block 1+2: Task/contact batch actions, inline editing, VCF export
- Block 3: Notes improvements (share modal, delete confirm, metadata, quick note shortcut)
- Block 4: Bases enhanced grid (CSV export, multi-view, row search, aggregation footer)

---

## Productivity Dashboard (Phases 1–3) ✅ COMPLETE
Full spec: `SPEC-V4-PRODUCTIVITY.md`
- Schema: actions, baselines, email_stats tables + workspace field on ai_metrics
- API routes: /api/metrics/productivity, /actions, /comparison, /email-stats
- UI: /metrics/productivity page with 7-section COPIL dashboard
- Cross-workspace comparison, cost calculator, ROI stats

---

## Bases v2: Built-in Tables ✅ COMPLETE (latest)
Full spec: `SPEC-tables-v1.md`
- Replaced NocoDB dependency with native Neon-backed tables
- Schema: user_bases, user_tables, user_columns, user_rows
- TanStack Table grid, inline editing, column management
- Export: CSV, JSON, Markdown
- Latest commit: `60c5879` — full UI complete

---

## Current State: Nothing Pushed to GitHub
All work is local on `main`. Needs push + Vercel deploy.

---

## Next: Future Phases
- Gmail integration (OAuth flow built on `feature/gmail-oauth`)
- WhatsApp side-by-side with Gmail
- Google Drive + Sheets integration
- KORUS M365 integration
- Morning Brief auto-generation

---

# 5. EVALUATION

### Automated Verification
```bash
npm run build
for route in tasks projects areas sprints contacts organisations notes activity bases; do
  curl -s http://localhost:3000/api/$route | python3 -c "import sys,json; json.load(sys.stdin); print('  ✅')" 2>/dev/null || echo "  ❌ $route"
done
```

### Manual Checklist
- [ ] Home → stat widgets, workspace switching
- [ ] Create task → persists on refresh
- [ ] Kanban drag → status updates
- [ ] Eisenhower matrix → 4 quadrants, drag between
- [ ] Project detail → all tabs (Overview, Tasks, Notes, Docs, Bases, Team)
- [ ] Notes → BlockNote slash commands, auto-save
- [ ] Bases → create table, inline edit, export CSV
- [ ] Contacts → create, search, pipeline kanban
- [ ] Sprint → burndown chart, drag tasks in
- [ ] Search → text + semantic results
- [ ] Chat → text, voice, camera, images
- [ ] KORUS metrics → guest auth, 11 sections
- [ ] Mobile (375px) → everything usable
- [ ] iPad (768px) → responsive grid

---

# 6. ENVIRONMENT VARIABLES

```env
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
NOTION_API_KEY=...
NOTION_KORUS_TASKS_DB=...
NOTION_BF_TASKS_DB=...
NOTION_OC_TASKS_DB=...
OPENAI_API_KEY=...
AUTH_PASSWORD_HASH=...
KORUS_GUEST_PASSWORD_HASH=...
CRON_SECRET=...
OPENCLAW_GATEWAY_URL=ws://localhost:18789
OPENCLAW_GATEWAY_TOKEN=...
```

---

# 7. DESIGN SYSTEM (Summary)

Full system: `.interface-design/system.md`

| Token | Value | Usage |
|-------|-------|-------|
| --bg-base | #0F0F0F | Canvas + sidebar |
| --bg-surface-1 | #141414 | Cards, panels |
| --bg-surface-2 | #1A1A1A | Elevated cards |
| --bg-surface-3 | #222222 | Dropdowns, hover |
| --bg-inset | #0A0A0A | Inputs, recessed |
| --border-default | rgba(255,255,255,0.06) | All borders |
| --text-primary | #F5F5F5 | Body text |
| --text-secondary | #A0A0A0 | Supporting |
| --text-tertiary | #6B7280 | Metadata |
| --accent-bf | #D4A017 | Byron Film |
| --accent-korus | #008080 | KORUS |
| --accent-personal | #F97316 | Personal |

Typography: Geist Sans + Geist Mono. `font-sans` on `<body>`.
Depth: Borders-only, no shadows. Surface elevation via subtle lightness shifts.

---

# 8. AGENT INSTRUCTIONS

1. Read this SPEC.md + `.interface-design/system.md` + `.env.local`
2. Check the phase status tracker (Section 4) — work on the current phase
3. `npm run build` after every major component — fix errors before moving on
4. Commit at each milestone: `git add -A && git commit -m "feat/fix: <msg>"`
5. Write progress to `/tmp/dashboard-v4-status.txt`
6. On phase completion: write `PHASE_X_COMPLETE` to status file + `openclaw system event`

---

# 9. ARCHIVED REFERENCES

- `SPEC-v4-original.md` — Original 5-phase build spec (Phases 1–5). Superseded by this file.
- `PHASE6.md` — Deep implementation spec (now Section 4, Phase 6)
- `PHASE7.md` — Oli feedback round 1 (now Section 4, Phase 7)
- `PHASE8.md` — Oli feedback round 2 (now Section 4, Phase 8)
- `PHASE9.md` — Bug fixes + core completion (now Section 4, Phase 9)

These files are kept for reference but this unified SPEC.md is the single source of truth.

---

*This specification is designed so that a capable autonomous agent can execute for hours without human intervention. Every decision is explicit. Every constraint is encoded. Every acceptance criterion is independently verifiable.*
