# OPS Dashboard v5 — Feature Sprint

## Overview
Four feature blocks for the dashboard. Each is independent and can be built sequentially.

---

## Block 1: Task Checkboxes + Batch Actions

### Tasks Page (`app/tasks/tasks-client.tsx`)

**Checkbox Selection:**
- Add a checkbox to each task row (both list and table views)
- Select all / deselect all checkbox in the header
- Selected count indicator: "3 of 47 selected"
- Shift+click for range selection

**Batch Toolbar (appears when ≥1 task selected):**
Sticky bar at top or bottom with:
- **Change Status** — dropdown with all statuses (Backlog, To Do, In Progress, Needs Review, Done, Cancelled)
- **Change Assignee** — dropdown populated from `users` table
- **Toggle Urgent** — button, toggles urgent flag on all selected
- **Toggle Important** — button, toggles important flag on all selected
- **Delete** — red button, shows confirmation modal: "Delete X tasks? This cannot be undone."
- **Deselect All** — X button to clear selection

**API:**
- `PATCH /api/tasks/batch` — accepts `{ ids: string[], updates: Partial<Task> }`
- `DELETE /api/tasks/batch` — accepts `{ ids: string[] }`
- Both require auth session

**Implementation Notes:**
- Use React state for selection: `useState<Set<string>>`
- Batch API calls should be atomic (transaction in Drizzle)
- After batch update, refresh task list from server
- Selection should persist across status filter changes but clear on workspace switch

---

## Block 2: Contact Checkboxes + Batch Actions + VCF Export

### Contacts Page (`app/crm/`)

**Checkbox Selection (same pattern as tasks):**
- Checkbox on each contact row
- Select all / deselect all
- Selected count

**Batch Toolbar:**
- **Change Pipeline Stage** — dropdown with pipeline stages for current workspace
- **Delete** — with confirmation: "Delete X contacts? This cannot be undone."
- **Export as VCF** — generates a `.vcf` file containing all selected contacts
- **Deselect All**

**VCF Export:**
- Generate vCard 3.0 format for selected contacts
- Include: Full Name, Email(s), Phone(s), Organisation, Job Title, LinkedIn URL, Address
- For single contact: download `firstname-lastname.vcf`
- For multiple: download `contacts-export.vcf` (multi-vCard file)
- Add an "Export All" button to the page header (not just batch — always available)

**API:**
- `PATCH /api/contacts/batch` — accepts `{ ids: string[], updates: Partial<Contact> }`
- `DELETE /api/contacts/batch` — accepts `{ ids: string[] }`
- `POST /api/contacts/export-vcf` — accepts `{ ids: string[] }`, returns `.vcf` file

**VCF Format Example:**
```
BEGIN:VCARD
VERSION:3.0
FN:John Smith
N:Smith;John;;;
ORG:Byron Film
TITLE:Director of Photography
EMAIL;TYPE=WORK:john@byronfilm.com
TEL;TYPE=CELL:+61400000000
URL:https://linkedin.com/in/johnsmith
END:VCARD
```

---

## Block 3: Notes Improvements

### Current State
Notes exist at `/notes` with basic create/edit. Missing: project/area/sprint allocation, delete, share, global shortcut.

### Improvements:

**Note Metadata:**
- Add fields: `projectId`, `areaId`, `sprintId` to notes schema (if not already present)
- Note creation/edit dialog gets dropdowns for Project, Area, Sprint (same pattern as task dialog)
- Notes list shows project/area badge on each note

**Delete:**
- Add delete button on each note (trash icon)
- Confirmation modal: "Delete this note? This cannot be undone."
- `DELETE /api/notes/:id`

**Share:**
- "Share" button on each note opens a modal with options:
  - **Copy as Markdown** — copies note content to clipboard
  - **Email** — opens `mailto:` link with note title as subject, content as body
  - **WhatsApp** — opens `https://wa.me/?text=` with note content URL-encoded
  - **Download as .md** — downloads note as a Markdown file

**Global Shortcut:**
- `Cmd+Shift+N` (or a floating "+" button) opens a quick-create note modal from anywhere in the app
- Modal: title field, workspace selector, optional project/area, content editor
- Saves and closes — minimal friction

**Schema Changes (if needed):**
```sql
ALTER TABLE notes ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
ALTER TABLE notes ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id);
ALTER TABLE notes ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id);
```

---

## Block 4: NocoDB Integration (Replaces Bases)

### Strategy
Replace the current in-house Bases implementation with NocoDB, connected to our existing Neon Postgres.

### Setup:
1. Deploy NocoDB via Docker on the Mac mini (or as a Vercel-compatible service)
2. Connect NocoDB to our Neon database as an external data source
3. NocoDB runs alongside the dashboard — accessible at a sub-route or subdomain

### Integration Options (pick one):

**Option A: Embedded iframe (fastest)**
- Replace `/bases` page content with an iframe pointing to NocoDB
- NocoDB handles all the UI (dark theme, calculations, views)
- Dashboard provides auth gate, NocoDB handles data
- Minimal code changes

**Option B: NocoDB API + Custom UI (most control)**
- Use NocoDB's REST API from our dashboard
- Build custom table/grid component in our dashboard
- More work but fully integrated look & feel
- Use `nocodb-sdk` npm package

**Option C: Direct Neon tables + Better grid component (no NocoDB)**
- Skip NocoDB entirely
- Replace current Bases with a better table component (e.g., TanStack Table or AG Grid)
- Add formula evaluation (client-side or via Postgres computed columns)
- Add CSV export
- Keep everything in-house

### My Recommendation: Option A first, Option B later
- Start with iframe embed — get NocoDB running and useful immediately
- If we want tighter integration later, build custom UI using NocoDB API
- This way Oli gets the functionality NOW while we plan the perfect integration

### Docker Setup:
```bash
docker run -d \
  --name nocodb \
  -p 8080:8080 \
  -e NC_DB="pg://ep-jolly-grass-a7ffwvsd-pooler.ap-southeast-2.aws.neon.tech:5432?u=neondb_owner&p=npg_jyxJkq7F4oCW&d=neondb" \
  -e NC_AUTH_JWT_SECRET="$(openssl rand -hex 32)" \
  nocodb/nocodb:latest
```

### Dashboard Changes:
- Replace `/bases` page with NocoDB embed or API-driven grid
- Keep sidebar nav item "Bases"
- Add "Open in NocoDB" link for full NocoDB UI access
- Dark theme: NocoDB supports dark mode natively

### Cleanup:
- Remove current `bases` and `base_rows` tables from schema (after migration)
- Remove `stores/base-store.ts` and related components
- Remove old Bases page components

---

## Build Order (recommended)

1. **Block 1: Task Batch Actions** — most impactful, Oli asked for it first
2. **Block 2: Contact Batch Actions + VCF** — same pattern, quick to build after Block 1
3. **Block 3: Notes Improvements** — polish, lower risk
4. **Block 4: NocoDB Integration** — requires Docker setup + testing, do last

## General Rules
- Do NOT break existing functionality
- Test with `npm run build` after each block
- Commit after each block with descriptive message
- Match existing dark theme (#0F0F0F bg, #F5F5F5 text)
- Use existing component patterns (dialogs, buttons, cards)
- All API routes require auth session check
- Mobile responsive

## Environment
- DATABASE_URL is in .env.local (Neon Postgres)
- Next.js 16, React 19, Tailwind 4, Drizzle ORM
- Git: commit to main, Vercel auto-deploys
