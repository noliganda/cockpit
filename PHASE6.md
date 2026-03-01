# Phase 6 — Deep Implementation (P0 + P1 Fixes)

Read SPEC.md and .interface-design/system.md first. This phase fixes everything that was built as stubs or skeletons in the initial build.

**RULE: For every feature below, you must VERIFY it works by testing it, not just check it compiles.**

---

## P0 — CRITICAL (Fix These First)

### 1. BlockNote Editor (Notes Page)

The current `app/notes/note-editor.tsx` is a plain `<textarea>`. Replace it with actual BlockNote.

```
Required packages (already in package.json):
- @blocknote/react
- @blocknote/core  
- @blocknote/mantine
```

Implementation:
- Use `useCreateBlockNote()` hook with dark theme
- `<BlockNoteView>` component with dark theme colors matching our design system
- Slash commands (/) for block types: heading, paragraph, bullet, numbered, checklist, code, table, callout, divider
- Drag handles to reorder blocks
- Content stored as JSON in `notes.content` (JSONB column)
- Generate `contentPlaintext` from blocks for full-text search
- Auto-save on change (debounced 1s)
- The editor MUST render with dark background (#141414), light text (#F5F5F5), and proper styling

**Verify:** Open /notes, create a note, type "/" — slash command menu must appear. Drag a block — it must reorder.

### 2. Region Property (KORUS Only)

Add region field to task and project forms. ONLY visible when workspace is 'korus'.

Regions: 🇸🇬 Singapore, 🇦🇺 Australia, 🇫🇷 France, 🌏 Global

- `components/task-dialog.tsx` — add region dropdown, conditionally shown when `workspaceId === 'korus'`
- Project create/edit forms — same region dropdown
- Tasks list page — region filter chips (only visible for KORUS)
- Projects list page — region filter chips (only visible for KORUS)
- Region column exists in DB schema already

**Verify:** Switch to KORUS workspace → create task → region dropdown visible. Switch to Byron Film → no region field.

### 3. Notion Sync v5 Compatibility

Current `lib/notion-sync.ts` uses `notion.databases.query()`. Update to use Notion SDK v5 patterns:
- Query via `notion.databases.query()` is still valid in v5 but ensure property reading handles v5 response format
- Auto-detect title property name by reading database schema first: `notion.databases.retrieve({ database_id })`
- Map properties dynamically — don't hardcode "Name" or "Task name"
- Handle status properties that may be "Status" or "State" etc.

**Verify:** Run sync manually — tasks from all 3 Notion DBs appear in dashboard with correct statuses.

### 4. Chat Widget Architecture

WebSocket to localhost won't work on Vercel. Redesign:

Option A (recommended): REST polling bridge
- `/api/chat` POST — sends message to OpenClaw Gateway via HTTP
- `/api/chat` GET — polls for new messages
- Client polls every 2s when chat is open
- Gateway URL from env: `OPENCLAW_GATEWAY_URL`

Option B: Keep WebSocket but make URL configurable via `NEXT_PUBLIC_OPENCLAW_WS_URL` env var so it can point to the actual Gateway host.

Either way, the chat widget must:
- Send text messages
- Send images (file upload → base64 → POST to /api/chat)
- Voice input: Web Speech API → transcribed text → send
- Camera: `navigator.mediaDevices.getUserMedia({video: true})` → capture frame → canvas → base64 → send
- Show a camera button that opens a viewfinder overlay, user taps to capture
- Mobile: chat expands to full screen

**Verify:** Open chat → type message → it sends. Click mic → speak → text appears. Click camera → viewfinder opens → capture sends image.

---

## P1 — HIGH PRIORITY

### 5. KORUS APAC Metrics (Complete All 11 Sections)

Current `app/metrics/korus/korus-metrics-client.tsx` has ~4 sections. Add the remaining 7:

Use Recharts for all charts. KORUS teal (#008080) as primary chart color.

Sections needed (from SPEC.md):
1. ✅ Key Metrics (6 stat cards) — EXISTS
2. **Task Volume** — Bar chart, daily task completions, last 30 days
3. **Category Analysis** — Horizontal bar chart, tasks by area/category
4. **Operational Cost Trend** — Line chart, 30 days (use activity_log counts as proxy)
5. **BF vs KORUS Comparison** — Side-by-side grouped bars (tasks completed, 90 days)
6. ✅ Activity Timeline — EXISTS
7. **Recruitment Pipeline** — Table: candidate name, role, stage, date, source
8. **Outreach & Business Dev** — Table: company, contact, status, last touch
9. **Entity Setup** — Status table for KORUS SG and AU entities
10. **Systems & Infrastructure** — Status table (tools, integrations)
11. **Milestone Timeline** — Vertical timeline with dates and descriptions

Data sources: Pull from tasks, projects, contacts, activity_log in Postgres. For entity setup and systems, use static data that can be updated via Settings later.

**Verify:** Open /metrics/korus → all 11 sections render with proper charts and tables. Guest auth works separately.

### 6. CRM Pipeline Kanban

`app/crm/page.tsx` needs tabs: Contacts | Organisations | Pipeline

Pipeline tab:
- Kanban board with `@hello-pangea/dnd`
- Columns = pipeline stages (from contacts.pipelineStage)
- Cards show: contact name, company, last activity, tags
- Drag between columns → PATCH pipelineStage
- Workspace-specific pipeline stages

**Verify:** Open CRM → Pipeline tab → drag a contact between stages → stage updates.

### 7. Sprint Burndown Chart

`app/sprints/[id]/page.tsx` — add burndown sparkline:
- SVG chart showing ideal burndown line vs actual completed tasks
- X-axis: sprint dates (startDate → endDate)
- Y-axis: remaining tasks
- Actual line: count of incomplete tasks per day
- Use Recharts LineChart with two lines (ideal = dashed, actual = solid)

**Verify:** Open a sprint with tasks → burndown chart renders with two lines.

### 8. Mobile Responsive Pass

Every page must work at 375px:
- Tables → card/list layout on mobile (use `hidden md:table` + mobile card alternative)
- Sidebar → hamburger drawer with backdrop blur (already partially done, verify it works)
- Kanban → horizontal scroll with snap points
- Task dialog → full-screen modal on mobile
- Touch targets ≥ 44px on all interactive elements
- Chat widget → full screen when expanded on mobile

**Verify:** Resize browser to 375px → every page is usable. No horizontal overflow. No tiny tap targets.

### 9. Semantic Search (Wire It Up)

Current search overlay needs to use the actual search pipeline:

`lib/search.ts` should:
1. Full-text search via tsvector on activity_log (and entity tables)
2. If OPENAI_API_KEY exists, also do semantic search: embed query → pgvector cosine similarity
3. Combine results, deduplicate, rank by relevance
4. Return: entity type, title, workspace, snippet, score

`components/search-overlay.tsx` should:
- Full-screen overlay (not just a small dropdown)
- Search input at top with keyboard focus
- Filter chips: All | Tasks | Projects | Contacts | Notes | Activity
- Results with entity type icons, workspace color badges, snippets
- Keyboard navigation (arrow keys + enter)
- Click result → navigate to entity

**Verify:** Create some tasks → search for them by name → results appear. Search for something conceptual (tests semantic search).

### 10. UI Polish Pass

Apply .interface-design/system.md to every page:

- **Stat cards:** Add icon in top-right with 10% opacity accent background
- **Tables:** Header = #6B7280, 12px, 500, uppercase. Row hover = #141414. Border = rgba(255,255,255,0.04)
- **Empty states:** Centered, muted text, action button. Every page needs one.
- **Page transitions:** Framer Motion fade (200ms) on page mount. Card stagger (50ms).
- **Cards:** Ensure all cards have visible border (rgba(255,255,255,0.06)) and bg-surface-1 (#141414)
- **Top bar:** Add subtle workspace accent line (2px) at very top of main content area
- **Chat bubble:** Polish — shadow, workspace accent ring, pulse animation when new message

**Verify:** Visual inspection of every page — does it look like a polished product, not a wireframe?

---

## Completion Protocol

After each major feature (1-10):
1. Write status to `/tmp/dashboard-v4-status.txt` (e.g. "P0_1_BLOCKNOTE_DONE")
2. `git add -A && git commit -m "feat: <descriptive message>"`

When ALL 10 items are done:
1. Run `npm run build` — must pass clean
2. Write "PHASE_6_COMPLETE" to `/tmp/dashboard-v4-status.txt`
3. `git add -A && git commit -m "feat: v4 Phase 6 — deep implementation, all P0+P1 complete"`
4. Run: `openclaw system event --text "Done: Phase 6 complete — BlockNote, region, chat, KORUS metrics, CRM pipeline, search, mobile, polish" --mode now`
