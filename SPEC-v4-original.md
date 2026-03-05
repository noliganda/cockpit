# OPS DASHBOARD v4 — MASTER SPECIFICATION

*Specification v4.0 — 2026-03-01*
*Framework: Nath B. Jones' Four Disciplines + Five Primitives of Specification Engineering*
*Design System: Interface Design Plugin (.interface-design/system.md)*

---

## META

| Field | Value |
|-------|-------|
| Product | Ops Dashboard |
| Version | 4.0 (clean rebuild) |
| Owner | Olivier Marcolin (Oli) |
| Operator | Charlie (AI assistant) |
| URL | dashboard.oliviermarcolin.com |
| Repo | github.com/noliganda/charlie-dashboard |
| DB | Neon Postgres + pgvector (ap-southeast-2) |
| Deploy | Vercel (Hobby plan) |
| Stack | Next.js 15, TypeScript, Tailwind v4, Drizzle ORM, shadcn/ui |

---

# PRIMITIVE 1: SELF-CONTAINED PROBLEM STATEMENT

## Who Is This Human?

Olivier Marcolin runs two businesses from Byron Bay, Australia:
- **Byron Film** — Boutique video production ($250K → $500K revenue target 2026)
- **KORUS Group** — Premium commercial fit-out (expanding AU/SG operations)

He also has a personal workspace for life admin and the Charlie AI partnership.

Oli opens this dashboard between client calls, on his iPad on the couch, on his phone between shoots. He is NOT a developer. He needs to open it and immediately understand: where do things stand, what needs attention, what did Charlie do while he was away.

His AI assistant Charlie (that's me) accesses the dashboard programmatically via API routes to read/write tasks, log activity, and sync data. The dashboard is both a human interface AND an API layer for autonomous agent operations.

## What Must Be Accomplished?

Replace Notion as the single source of truth for both businesses and personal ops. Specifically:

1. **Task management** — Create, track, prioritize, and complete tasks across all three workspaces with workspace-specific statuses and workflows
2. **Project tracking** — Monitor project progress with linked tasks, timelines, and budgets
3. **CRM** — Contacts, organisations, pipeline tracking for sales and recruitment
4. **Sprint execution** — Time-boxed work blocks with kanban boards
5. **Rich notes** — Block-based editor (like Notion) for meeting notes, briefs, documentation
6. **Operational metrics** — KORUS APAC board dashboard with guest access for Bruno and the Copil
7. **Semantic search** — Natural language search across all activity history using vector embeddings
8. **AI chat interface** — Talk to Charlie directly from the dashboard (text, voice, images)
9. **Activity logging** — Every action recorded with vector embeddings for long-term organizational memory
10. **Data ownership** — All data in one Postgres database. `pg_dump` captures everything. Zero vendor lock-in.

## What Should This Feel Like?

A command center for a one-person army augmented by AI. Dense but not cramped. Calm authority. Like Linear meets Vercel — precision without coldness. The kind of tool where you open it and immediately know where you stand across both businesses.

The workspace accent colors (Byron Film gold, KORUS teal, Personal orange) are the signature — they tell you which world you're in at a glance, flowing through the sidebar, stat cards, active states, and badges.

## What This Is NOT

- NOT a marketing site (no landing page, no SEO)
- NOT a multi-tenant SaaS (one user + guest access for KORUS board)
- NOT a Notion clone (opinionated workflows, not a generic blocks editor)
- NOT a coding project demo (must feel like a real product a non-technical CEO uses daily)

## Context a New Agent Must Know

- Notion SDK v5: use `dataSources` not `databases`, `data_source_id` not `database_id`. Default `Notion-Version: 2025-09-03`
- Each Notion DB has DIFFERENT title property names — auto-detect via schema retrieval
- Status options differ per workspace DB — query valid options before mapping
- Vercel Hobby plan: cron jobs must be daily frequency only
- Single `app/` directory at root (NOT `src/app/`)
- The `region` property is KORUS-only — never show on Byron Film or Personal workspaces
- All env vars are in `.env.local` — never hardcode secrets
- pgvector extension is already enabled on the Neon DB
- OpenClaw Gateway runs at `ws://localhost:18789` for the chat widget

---

# PRIMITIVE 2: ACCEPTANCE CRITERIA

The build is complete when an independent observer can verify ALL of the following without asking any questions:

## Core Function
1. ✅ All pages render without errors at desktop (1440px), tablet (768px), and mobile (375px)
2. ✅ Creating a task in the UI persists it to Postgres and it survives a page refresh
3. ✅ Switching workspaces updates the sidebar accent color, filters all data, and shows workspace-specific statuses
4. ✅ Dragging a task on kanban updates its status via API
5. ✅ Notion sync pulls tasks from all 3 Notion DBs and upserts them with correct status mapping
6. ✅ Activity feed on home page shows the last 20 actions with actor, action, entity, and timestamp

## Rich Features
7. ✅ Notes page has a BlockNote block editor with slash commands, drag handles, and dark theme
8. ✅ Semantic search returns relevant results for natural language queries (e.g. "KORUS recruitment progress")
9. ✅ Chat widget connects to OpenClaw Gateway WebSocket and sends/receives messages
10. ✅ Chat widget supports image upload (drag-drop, paste, file picker) sent as base64 to Gateway
11. ✅ Chat widget supports browser-native speech input (Web Speech API → text → send)
12. ✅ Chat widget supports mobile camera capture (getUserMedia → photo → send to Gateway for vision)
13. ✅ KORUS APAC metrics page renders all 11 sections with real data from Postgres

## Data Integrity
14. ✅ Every API mutation writes to `activity_log` with actor, action, entity details
15. ✅ Activity log entries have vector embeddings (generated async, non-blocking)
16. ✅ `pg_dump` of the database captures ALL data including vectors — verified manually
17. ✅ Notion sync is idempotent — running twice produces no duplicates

## Auth & Access
18. ✅ Main dashboard behind password auth (7-day cookie)
19. ✅ KORUS metrics page has separate guest auth (24h cookie, `KORUS_GUEST_PASSWORD_HASH` env var)
20. ✅ All API routes reject unauthenticated requests

## Build Quality
21. ✅ `npm run build` passes with ZERO TypeScript errors
22. ✅ No `any` types in business logic (lib/, app/api/, components/ — ui/ primitives excepted)
23. ✅ No hardcoded Notion property names — all auto-detected
24. ✅ No localStorage for business data (only UI preferences: sidebar state, theme, last workspace)
25. ✅ No Supabase references anywhere in the codebase

---

# PRIMITIVE 3: CONSTRAINT ARCHITECTURE

## MUST DO (Non-Negotiable)

### Architecture
- Single Postgres database (Neon) via Drizzle ORM for ALL data including vectors
- pgvector for embeddings — same DB, not a separate service
- Next.js 15 App Router with a SINGLE `app/` directory at project root
- Server Components for data fetching — client components only for interactivity
- Every entity has `workspaceId` as a required field
- Every API mutation writes to `activity_log`
- Embedding generation is async and non-blocking — never block a write on OpenAI API

### UI/UX
- Dark theme ONLY — follow `.interface-design/system.md` for all design tokens
- Mobile + iPad responsive — every page works at 375px, 768px, 1440px+
- Sidebar collapses to hamburger drawer on mobile
- Tables collapse to card layouts on mobile (NOT horizontal scroll)
- Touch-friendly tap targets (min 44px)
- Workspace accent colors flow through: sidebar active state, stat card icons, badges, active tabs
- Follow the Interface Design plugin principles: subtle layering, borders-only depth, whisper-quiet surface shifts

### Libraries
- Tailwind CSS v4 + shadcn/ui for styling
- Framer Motion for animations (200-300ms, ease-out, stagger 50ms)
- Lucide React for icons (one icon set, consistent throughout)
- BlockNote (`@blocknote/react`, `@blocknote/core`, `@blocknote/mantine`) for notes editor
- `@hello-pangea/dnd` for drag-and-drop (kanban, sprint planning)
- Recharts for charts/metrics
- `date-fns` for date formatting
- Zod for API request/response validation
- `@notionhq/client` v5 for Notion sync
- `ai` (Vercel AI SDK) for streaming chat if needed

## MUST NOT DO (Hard Constraints)

- ❌ Do NOT use localStorage for business data
- ❌ Do NOT create files in `src/` — everything at project root
- ❌ Do NOT use Supabase, Firebase, or any second database
- ❌ Do NOT use the old Notion REST API — always SDK v5
- ❌ Do NOT hardcode Notion property names
- ❌ Do NOT import from mock data files in production
- ❌ Do NOT use `any` type in business logic
- ❌ Do NOT show `region` property outside KORUS workspace
- ❌ Do NOT use native `<select>` or `<input type="date">` — build custom styled components
- ❌ Do NOT use pure white (#FFFFFF) for text — use #F5F5F5
- ❌ Do NOT make sidebar a different background from canvas

## PREFER (When Multiple Valid Approaches Exist)

- Server Components over Client Components where possible
- `drizzle-orm` query builder over raw SQL
- Named exports over default exports
- Small focused components (<150 lines each)
- Composition over inheritance
- Conventional commit messages (`feat:`, `fix:`, `chore:`)
- rgba borders over solid hex borders
- Generated `tsvector` columns over application-level text search
- Background job for embeddings over synchronous generation

## ESCALATE (Don't Decide Autonomously)

- Any change to the database schema after initial creation
- Any new external service or API dependency
- Removing or renaming existing API routes
- Changes to auth flow or password hashing
- Any operation that could lose data

---

# PRIMITIVE 4: DECOMPOSITION

## Phase 1: Foundation (Everything Else Depends On This)

### 1.1 Project Scaffold
- Init Next.js 15 with TypeScript, Tailwind v4, App Router
- Install ALL dependencies (see library list above)
- Setup `drizzle.config.ts` pointing to Neon
- Setup `lib/db/index.ts` — Drizzle client with Neon serverless driver
- Setup `lib/env.ts` — Zod-validated env vars
- Setup `app/globals.css` with design system tokens from `.interface-design/system.md`
- Setup `tailwind.config.ts` (if needed for v4)
- Create `types/index.ts` with ALL TypeScript types

### 1.2 Database Schema (`lib/db/schema.ts`)
All tables in ONE file. Every table has: `id` (uuid), `workspaceId` (text), `createdAt`, `updatedAt`.

```
Tables:
- workspaces (id, name, slug, color, icon)
- tasks (id, workspaceId, title, description, status, priority, impact, effort, urgent, important, dueDate, assignee, tags[], areaId, projectId, sprintId, notionId, notionLastSynced, region — KORUS only)
- projects (id, workspaceId, name, description, status, areaId, startDate, endDate, budget, region — KORUS only)
- areas (id, workspaceId, name, description, color, icon, order)
- sprints (id, workspaceId, name, goal, startDate, endDate, status)
- contacts (id, workspaceId, name, email, phone, company, organisationId, role, address, website, linkedinUrl, notes, pipelineStage, tags[], source)
- organisations (id, workspaceId, name, industry, website, phone, email, address, notes, pipelineStage, tags[], size)
- notes (id, workspaceId, title, content JSONB, contentPlaintext TEXT, pinned, projectId, tags[])
- activity_log (id, workspaceId, actor, action, entityType, entityId, entityTitle, description, metadata JSONB, embedding VECTOR(1536) nullable, embeddingModel TEXT, searchVector TSVECTOR generated, createdAt)
- users (id, email, passwordHash, role, preferences JSONB, createdAt)
```

Run `drizzle-kit push` to create tables. Verify pgvector extension is active.

### 1.3 API Layer (`app/api/`)
RESTful CRUD for every entity. Pattern:
```
GET    /api/{entity}?workspace=X     — list (filtered)
POST   /api/{entity}                  — create
GET    /api/{entity}/[id]             — get one
PATCH  /api/{entity}/[id]             — update
DELETE /api/{entity}/[id]             — soft delete or hard delete
```

Every mutation calls `logActivity()`. Zod validation on all inputs.

Routes:
- `/api/tasks` + `/api/tasks/[id]`
- `/api/projects` + `/api/projects/[id]`
- `/api/areas` + `/api/areas/[id]`
- `/api/sprints` + `/api/sprints/[id]`
- `/api/contacts` + `/api/contacts/[id]`
- `/api/organisations` + `/api/organisations/[id]`
- `/api/notes` + `/api/notes/[id]`
- `/api/activity` (GET — list, supports ?workspace= and ?entityType= filters)
- `/api/search` (POST — combined full-text + semantic search)
- `/api/sync/notion` (GET status, POST trigger sync)
- `/api/backup/obsidian` (POST trigger export)
- `/api/auth` (POST login, GET session check)
- `/api/auth/guest` (POST KORUS guest login)
- `/api/seed` (POST — seed default areas + Notion sync)
- `/api/cron/notion-sync` (GET — Vercel cron endpoint with CRON_SECRET)
- `/api/cron/embed-backfill` (GET — backfill NULL embeddings)
- `/api/metrics/korus` (GET — aggregated KORUS APAC metrics)
- `/api/chat` (WebSocket proxy or REST bridge to OpenClaw Gateway)

### 1.4 Shared Utilities
- `lib/activity.ts` — `logActivity()` writes to Neon, queues embedding async
- `lib/embeddings.ts` — OpenAI text-embedding-3-small with error handling + model tracking
- `lib/notion-sync.ts` — Notion SDK v5 sync with auto-schema detection
- `lib/obsidian-export.ts` — Markdown export with YAML frontmatter to OpsOS vault
- `lib/auth.ts` — Password hash check, session cookie management
- `lib/search.ts` — Combined full-text (tsvector) + semantic (pgvector) search
- `lib/utils.ts` — cn(), formatDate(), formatRelativeDate(), isOverdue(), etc.
- `lib/env.ts` — Zod env validation

### 1.5 Checkpoint
- `npm run build` passes
- `drizzle-kit push` creates all tables
- All API routes return valid JSON
- Activity log records mutations
- **Commit:** `feat: v4 Phase 1 — foundation, schema, API layer`

---

## Phase 2: Layout, Navigation & Auth

### 2.1 Root Layout (`app/layout.tsx`)
- Dark theme HTML with Geist Sans + Geist Mono (`font-sans` class on body!)
- AuthProvider wraps everything — login screen if not authenticated
- Sidebar + MainContent layout

### 2.2 Auth Gate (`components/auth-gate.tsx`)
- Password login screen (bcrypt hash in `AUTH_PASSWORD_HASH` env var)
- 7-day session cookie
- Clean login UI matching design system
- Default password: `opsdb2026`

### 2.3 Sidebar (`components/sidebar.tsx`)
**Follow `.interface-design/system.md` — Sidebar section:**
- Width: 240px (collapsed: 56px)
- Background: SAME as canvas (`--bg-base: #0F0F0F`) — NOT different
- Right border: `rgba(255,255,255,0.06)`
- Active link: subtle bg shift + left 2px accent border in workspace color
- Hover: whisper-quiet bg shift
- Mobile: hamburger drawer with backdrop blur
- Navigation: Home, Tasks, Kanban, Projects, Areas, Sprints, CRM, Notes, Documents, Messages, Brief, Metrics, Settings

### 2.4 Workspace Switcher (`components/workspace-switcher.tsx`)
- Dropdown at top of sidebar
- Three workspaces with colored dots: Byron Film (gold), KORUS (teal), Personal (orange)
- Selecting workspace filters all content and updates accent color throughout

### 2.5 Command Palette (`components/command-palette.tsx`)
- `Cmd+K` to open
- Search tasks, projects, contacts by name
- Quick-create task
- Navigate to any page

### 2.6 Top Bar
- Search button (triggers search overlay)
- Notion sync indicator (last sync time + manual trigger)
- Workspace accent color subtle line at top edge

### 2.7 Checkpoint
- Layout renders at all breakpoints
- Auth gate blocks unauthenticated access
- Workspace switching works
- Command palette opens and navigates
- **Commit:** `feat: v4 Phase 2 — layout, auth, navigation`

---

## Phase 3: Core Pages

### 3.1 Home Dashboard (`app/page.tsx`)
- Server component fetching from Postgres
- Stat cards: Due Today, Due This Week, Overdue, Total Tasks (workspace-filtered)
- Workspace Overview: card per workspace with task counts and progress
- Recent Activity feed (from activity_log, last 20 entries)
- Quick Start section for empty state

### 3.2 Tasks (`app/tasks/page.tsx`)
- Sortable table: status, title, assignee, due date, priority, tags
- Filter bar: status, assignee, tags, search text
- Quick-add task inline
- Click row → task detail dialog (edit all fields, delete, Notion badge)
- **Workspace-specific statuses:**
  - Byron Film: Backlog → Pre-Prod → In Prod → Post-Prod → Review → Delivered → Invoiced → Paid
  - KORUS: Lead → Qualification → Proposal → Negotiation → Won → Lost → On Hold
  - Personal: To Do → In Progress → Completed
- Region filter (KORUS only — hidden for other workspaces)
- Mobile: card layout, not table

### 3.3 Kanban (`app/tasks/kanban/page.tsx`)
- Client component with `@hello-pangea/dnd`
- Columns = workspace-specific statuses
- Drag between columns → PATCH status
- Cards: title, assignee, due date, priority dot, tags
- Horizontal scroll on mobile

### 3.4 Projects (`app/projects/page.tsx` + `[id]/page.tsx`)
- Grid of project cards with progress bars (% tasks completed)
- Region filter chips (KORUS only: 🇸🇬🇦🇺🇫🇷🌏)
- Project detail: overview, linked tasks, linked contacts, timeline
- Create/edit project dialog

### 3.5 Areas (`app/areas/page.tsx` + `[id]/page.tsx`)
- Based on 8 Core Concepts: Leadership, Finances, Operations, Growth, Production, Service, Sales, Marketing
- Byron Film adds: AI/Automations, Private
- Area cards with task/project counts
- Area detail: linked projects, linked tasks

### 3.6 Sprints (`app/sprints/page.tsx` + `[id]/page.tsx`)
- Sprint list with status badges (Planning / Active / Completed)
- Sprint detail: kanban board of sprint tasks, burndown sparkline
- Sprint planning: drag unassigned tasks into sprint

### 3.7 CRM (`app/crm/page.tsx` + `[id]/page.tsx`)
- Tabs: Contacts, Organisations, Pipeline
- Contact list with search + filters
- Contact detail: info, linked projects, activity log for this contact
- Organisation detail
- Pipeline: kanban view by pipeline stage

### 3.8 Notes (`app/notes/page.tsx`)
- Two-panel: note list (left), BlockNote editor (right)
- **BlockNote editor** with dark theme:
  - Slash commands (`/`) for block types
  - Drag handles to reorder
  - Block types: headings, paragraph, bullet, numbered, checklist, code, image, table, callout, divider
  - Inline: bold, italic, underline, strikethrough, code, link, highlight
- Content stored as JSONB in Postgres `notes.content`
- `contentPlaintext` generated for full-text search
- Pin notes, filter by workspace, tags

### 3.9 Settings (`app/settings/page.tsx`)
- Notion sync: trigger, status, last sync time
- Obsidian backup: trigger, status
- Account: change password
- Data: seed defaults, clear data (with confirmation)
- Workspace management

### 3.10 Metrics (`app/metrics/page.tsx`)
- Cost efficiency calculator: rate slider, currency toggle, period selector
- ROI stats: total savings, hours saved, tasks completed
- Category breakdown charts

### 3.11 KORUS APAC Metrics (`app/metrics/korus/page.tsx`)
**Standalone executive dashboard for the KORUS Board (Copil).**
- Separate guest auth (`KORUS_GUEST_PASSWORD_HASH`, 24h cookie)
- No sidebar — full-width, `max-w-6xl` centered
- KORUS teal (#008080) accent throughout
- **11 Sections:**
  1. Key Metrics — 6 stat cards (Tasks Completed, Hours Saved, Emails Processed, Research Hours, Active Candidates, Proposals Sent)
  2. Task Volume — Bar chart (daily, last 30 days)
  3. Category Analysis — Horizontal bar chart by category
  4. Operational Cost Trend — Line chart (30 days)
  5. Byron Film vs KORUS Capability Comparison — Side-by-side bars (90 days)
  6. Activity Timeline — Last 20 actions with colored dots
  7. Recruitment Pipeline — Table with stages
  8. Outreach & Business Development — Table
  9. Entity Setup — Status table (KORUS SG, AU)
  10. Systems & Infrastructure — Status table
  11. Milestone Timeline — Vertical timeline
- All data from `activity_log` + task/project aggregations in Neon Postgres

### 3.12 Placeholder Pages
- Documents (`app/documents/page.tsx`) — "Coming soon" with Drive/OneDrive links
- Messages (`app/messages/page.tsx`) — "Coming soon" placeholder
- Brief (`app/brief/page.tsx`) — Morning brief placeholder (future: auto-generated)

### 3.13 Checkpoint
- All pages render at all breakpoints
- CRUD works on all entities
- Kanban drag-and-drop works
- BlockNote editor saves/loads
- KORUS metrics renders all 11 sections
- **Commit:** `feat: v4 Phase 3 — all core pages`

---

## Phase 4: Integrations & Intelligence

### 4.1 Notion Sync (`lib/notion-sync.ts`)
- Notion SDK v5 — auto-detect title property per DB via schema query
- Env vars: `NOTION_KORUS_TASKS_DB`, `NOTION_BF_TASKS_DB`, `NOTION_OC_TASKS_DB`
- Upsert by `notionId` — create new, update changed, skip unchanged
- Map Notion statuses to dashboard statuses per workspace
- Cron: daily via `/api/cron/notion-sync` with `CRON_SECRET` auth
- Manual trigger via Settings page

### 4.2 Activity Logging + Embeddings (`lib/activity.ts` + `lib/embeddings.ts`)
- Every mutation writes to `activity_log` synchronously (fast, local DB)
- Embedding generated async via background process or API route
- Embedding model tracked per row (`embedding_model` column)
- Backfill cron: `/api/cron/embed-backfill` fills NULL embeddings daily
- If OpenAI is down, writes succeed with NULL embedding — backfilled later

### 4.3 Search (`lib/search.ts` + `/api/search`)
- **Layer 1: Exact match** — SQL WHERE clauses on fields
- **Layer 2: Full-text** — Postgres `tsvector` + `tsquery` with ranking
- **Layer 3: Semantic** — pgvector cosine similarity on activity_log embeddings
- API combines all three, returns ranked, deduplicated results
- Search UI: floating overlay, keyboard navigable, workspace/entity type filters

### 4.4 Charlie Chat Widget (`components/charlie-chat.tsx`)
- Floating bubble bottom-right (like Intercom), expandable to chat panel
- Connects to OpenClaw Gateway: `ws://localhost:18789`
- Uses Gateway `chat.send` / `chat.history` protocol
- Full markdown rendering in message bubbles
- **Image support:** drag-drop, paste, or file upload → base64 → Gateway
- **Camera:** `navigator.mediaDevices.getUserMedia({ video: true })` → capture frame → send
- **Voice input:** Web Speech API (`webkitSpeechRecognition`) → transcribe → send as text
- Context-aware: sends current page URL + workspace as metadata
- Collapsible, remembers state in localStorage
- Mobile: full-screen when expanded
- Auth: uses Gateway token from env or dashboard session

### 4.5 Obsidian Export (`lib/obsidian-export.ts`)
- Path: `~/Library/Mobile Documents/com~apple~CloudDocs/OpsOS/`
- Structure: `{workspace}/{entityType}/{slug}.md`
- YAML frontmatter: lowercase snake_case, ISO dates, wiki-links
- Triggered via Settings or API

### 4.6 Checkpoint
- Notion sync pulls real data
- Search returns relevant results (text + semantic)
- Chat widget connects and sends/receives messages
- Camera/voice/image work in chat
- **Commit:** `feat: v4 Phase 4 — integrations, search, chat widget`

---

## Phase 5: Polish, Deploy & Verify

### 5.1 Mobile Responsive Pass
- Every page at 375px, 768px, 1440px
- Sidebar drawer on mobile
- Tables → card layouts
- Touch targets ≥ 44px
- Chat widget full-screen on mobile

### 5.2 Animation Pass
- Page transitions: fade (200ms)
- Card enter: fade-in + slide-up (10px, 250ms, stagger 50ms)
- Sidebar open/close: slide (300ms, ease-out)
- Kanban drag: subtle shadow lift

### 5.3 Empty States
- Every page has a meaningful empty state
- Centered, muted text, optional action button
- No placeholder illustrations

### 5.4 Error States
- API errors show toast notification
- Network errors show retry prompt
- 404 pages styled consistently

### 5.5 Final Build Verification
- `npm run build` — ZERO errors
- All API routes return valid JSON
- Auth gate blocks unauthenticated access
- KORUS guest auth works independently
- Notion sync runs successfully
- Search returns results
- Chat widget connects

### 5.6 Deploy
- Push to GitHub
- Vercel auto-deploys from main branch
- Verify env vars are set on Vercel
- Test on live URL

### 5.7 Checkpoint
- **Commit:** `feat: v4 Phase 5 — responsive, animations, polish, deploy-ready`

---

# PRIMITIVE 5: EVALUATION DESIGN

## Automated Verification (run after build)

```bash
# 1. Build passes
npm run build

# 2. All API routes return valid JSON (test locally first)
for route in tasks projects areas sprints contacts organisations notes activity; do
  echo "Testing /api/$route..."
  curl -s http://localhost:3000/api/$route | python3 -c "import sys,json; json.load(sys.stdin); print('  ✅ valid JSON')" 2>/dev/null || echo "  ❌ FAILED"
done

# 3. Create a task
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Eval test task","workspaceId":"byron-film","status":"Backlog"}' | jq .id

# 4. Search works
curl -s -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"eval test"}' | jq '.results | length'

# 5. Activity log has entries
curl -s http://localhost:3000/api/activity?limit=1 | jq '.[0].action'

# 6. Notion sync
curl -s -X POST http://localhost:3000/api/sync/notion | jq '.results'
```

## Manual Verification Checklist

- [ ] Open dashboard → home page with stat widgets
- [ ] Switch workspace → accent color changes, data filters
- [ ] Create task → persists on refresh
- [ ] Drag task on kanban → status updates
- [ ] Open project → see linked tasks
- [ ] Edit note in BlockNote → slash commands work, saves on blur
- [ ] Search "KORUS recruitment" → relevant results
- [ ] Open chat widget → send message → receive response
- [ ] Upload image in chat → Charlie receives it
- [ ] Speak into chat (voice) → transcribed and sent
- [ ] Open /metrics/korus without main auth → guest login works
- [ ] Check on iPhone (375px) → sidebar hamburger, cards stack, touch-friendly
- [ ] Check on iPad (768px) → responsive grid, sidebar toggles
- [ ] Run Notion sync → tasks appear from Notion

## Regression Tests (After Model Updates or Rebuilds)

Save these three test cases as known-good baselines:
1. **Task CRUD cycle:** Create → read → update status → delete → verify gone
2. **Cross-workspace isolation:** Create task in KORUS → switch to Byron Film → task NOT visible
3. **Search pipeline:** Create task with unique title → wait 30s (embedding) → semantic search returns it

---

# ENVIRONMENT VARIABLES

```env
# Database (Neon Postgres + pgvector)
DATABASE_URL=postgresql://<user>:<password>@<host>/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://<user>:<password>@<host>/neondb?sslmode=require

# Notion
NOTION_API_KEY=<notion integration token>
NOTION_KORUS_TASKS_DB=<notion database id>
NOTION_BF_TASKS_DB=<notion database id>
NOTION_OC_TASKS_DB=<notion database id>

# Embeddings
OPENAI_API_KEY=<from .env>

# Auth
AUTH_PASSWORD_HASH=<bcrypt hash of admin password>
KORUS_GUEST_PASSWORD_HASH=<bcrypt hash for KORUS guest access>
CRON_SECRET=<strong random secret>

# OpenClaw Gateway (for chat widget)
OPENCLAW_GATEWAY_URL=ws://localhost:18789
OPENCLAW_GATEWAY_TOKEN=<from gateway config>
```

---

# DESIGN SYSTEM REFERENCE

**Full design system is in `.interface-design/system.md`** — the build agent MUST read it before writing ANY component.

Key tokens (summary):
| Token | Value | Usage |
|-------|-------|-------|
| --bg-base | #0F0F0F | Canvas |
| --bg-surface-1 | #141414 | Cards, panels |
| --bg-surface-2 | #1A1A1A | Elevated cards |
| --bg-surface-3 | #222222 | Dropdowns, hover |
| --bg-inset | #0A0A0A | Inputs, recessed |
| --border-default | rgba(255,255,255,0.06) | Standard borders |
| --text-primary | #F5F5F5 | Body text |
| --text-secondary | #A0A0A0 | Supporting |
| --text-tertiary | #6B7280 | Metadata |
| --accent-bf | #D4A017 | Byron Film |
| --accent-korus | #008080 | KORUS |
| --accent-personal | #F97316 | Personal |

**Typography:** Geist Sans + Geist Mono. `font-sans` class MUST be on `<body>`.

**Depth strategy:** Borders-only. No shadows. Surface elevation via subtle lightness shifts.

**The Interface Design Plugin will enforce all of this automatically if `.interface-design/system.md` is loaded.**

---

# FILE STRUCTURE

```
charlie-dashboard/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Home
│   ├── globals.css
│   ├── tasks/
│   │   ├── page.tsx                # Task list
│   │   └── kanban/page.tsx         # Kanban board
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── areas/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── sprints/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── crm/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── notes/page.tsx
│   ├── documents/page.tsx
│   ├── messages/page.tsx
│   ├── brief/page.tsx
│   ├── metrics/
│   │   ├── page.tsx
│   │   └── korus/page.tsx          # Standalone KORUS APAC
│   ├── settings/page.tsx
│   └── api/
│       ├── tasks/[route.ts, [id]/route.ts]
│       ├── projects/[route.ts, [id]/route.ts]
│       ├── areas/[route.ts, [id]/route.ts]
│       ├── sprints/[route.ts, [id]/route.ts]
│       ├── contacts/[route.ts, [id]/route.ts]
│       ├── organisations/[route.ts, [id]/route.ts]
│       ├── notes/[route.ts, [id]/route.ts]
│       ├── activity/route.ts
│       ├── search/route.ts
│       ├── sync/notion/route.ts
│       ├── backup/obsidian/route.ts
│       ├── auth/[route.ts, guest/route.ts]
│       ├── seed/route.ts
│       ├── chat/route.ts
│       ├── metrics/korus/route.ts
│       └── cron/[notion-sync/route.ts, embed-backfill/route.ts]
├── components/
│   ├── ui/                         # shadcn primitives
│   ├── sidebar.tsx
│   ├── main-content.tsx
│   ├── workspace-switcher.tsx
│   ├── command-palette.tsx
│   ├── auth-gate.tsx
│   ├── search-overlay.tsx
│   ├── charlie-chat.tsx
│   ├── task-card.tsx
│   ├── task-dialog.tsx
│   ├── kanban-board.tsx
│   ├── activity-feed.tsx
│   ├── metric-card.tsx
│   ├── contact-dialog.tsx
│   └── note-editor.tsx             # BlockNote wrapper
├── lib/
│   ├── db/[index.ts, schema.ts]
│   ├── activity.ts
│   ├── embeddings.ts
│   ├── search.ts
│   ├── notion-sync.ts
│   ├── obsidian-export.ts
│   ├── auth.ts
│   ├── env.ts
│   └── utils.ts
├── hooks/
│   ├── use-sidebar.ts
│   └── use-workspace.ts
├── types/index.ts
├── .interface-design/system.md
├── .claude/[skills, commands]
├── drizzle.config.ts
├── vercel.json
├── package.json
├── tsconfig.json
└── SPEC.md
```

---

# AGENT INSTRUCTIONS

## Before Starting
1. Read this entire SPEC.md
2. Read `.interface-design/system.md` — this is your design bible
3. Read `.env.local` for all env vars

## Build Process
1. Work through phases sequentially (1 → 2 → 3 → 4 → 5)
2. Run `npm run build` after EVERY major component — fix errors before moving on
3. Commit at each phase checkpoint with the specified commit message
4. Write progress to `/tmp/dashboard-v4-status.txt` at each checkpoint

## Design Enforcement
- Before writing ANY UI component, mentally reference the design system
- Use the token values from `.interface-design/system.md`, not arbitrary colors
- Sidebar background = canvas background (same color)
- Borders = rgba, not solid hex
- Text = #F5F5F5, not #FFFFFF
- Surfaces shift by 2-4% lightness per elevation level

## Completion Protocol
After completing each phase:
1. Write status to `/tmp/dashboard-v4-status.txt`
2. `git add -A && git commit -m "<phase commit message>"`

When completely finished:
1. Write "V4_BUILD_COMPLETE" to `/tmp/dashboard-v4-status.txt`
2. Run: `openclaw system event --text "Done: OPS Dashboard v4 complete — all 5 phases built" --mode now`

---

*This specification is designed so that a capable autonomous agent can execute against it for hours without human intervention. Every decision is explicit. Every constraint is encoded. Every acceptance criterion is independently verifiable.*
