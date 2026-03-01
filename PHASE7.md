# Phase 7 — Oli's Feedback + Remaining Gaps

Read .interface-design/system.md for design tokens. Read SPEC.md for full context.

**These are direct feedback items from the product owner. Every single one must be implemented properly — not stubs, not skeletons. VERIFY each one works.**

---

## FROM OLI'S REVIEW (Priority Order)

### 1. Tasks — Urgent/Important Checkboxes + Eisenhower Matrix

**Task list page (`app/tasks/page.tsx`):**
- Add visible ⚡ Urgent and ⭐ Important toggle checkboxes on each task row
- Checkboxes should be clickable inline (PATCH immediately, no dialog needed)
- Filter bar: add Urgent/Important filter buttons
- The `urgent` and `important` boolean columns already exist in the schema

**Eisenhower Matrix page (`app/tasks/matrix/page.tsx`):**
- NEW PAGE at `/tasks/matrix`
- Add to sidebar navigation after "Kanban"
- 2×2 grid layout:
  - Top-left: 🚨 Urgent + Important → "Do First"
  - Top-right: ⭐ Important only → "Schedule"  
  - Bottom-left: ⚡ Urgent only → "Delegate"
  - Bottom-right: Neither → "Eliminate"
- Each quadrant shows task cards (title, due date, workspace badge)
- Tasks draggable between quadrants (updates urgent/important flags)
- Color-coded quadrants: red, blue, yellow, gray
- Workspace filter at top

**Verify:** Open tasks → click urgent checkbox → task updates. Open /tasks/matrix → 4 quadrants with tasks sorted correctly. Drag task to different quadrant → flags update.

### 2. Settings — User Management with Roles

**New section in Settings page:**
- User accounts table: email, role, created date
- Roles with permissions:
  - **Admin** — full access including Settings, user management, data deletion
  - **Collaborator** — can create/edit/delete tasks, projects, contacts, notes. Cannot access Settings or manage users.
  - **Guest** — view only. Cannot create, edit, or delete anything. Can view dashboards and search.
- Create user form: email + password + role dropdown
- Edit user: change role, reset password
- Delete user (with confirmation)
- Current session shows logged-in user's role
- ALL API routes must check user role before allowing mutations
  - GET routes: all roles
  - POST/PATCH/DELETE: admin + collaborator only
  - Settings/user management: admin only
- The `users` table already exists in schema. Add `role` field if not there (default: 'admin' for first user)

**Auth flow update:**
- Login checks email + password (not just password)
- Session cookie stores user ID + role
- `getSession()` returns `{ userId, email, role }`
- Middleware or route-level checks enforce permissions

**Verify:** Create a guest user → login as guest → try to create a task → should be blocked. Login as admin → can access Settings.

### 3. Areas, Projects & Tasks — Full CRUD + Status

All three entity types need complete create/edit/delete flows:

**Areas (`app/areas/page.tsx` + `[id]/page.tsx`):**
- Create area dialog: name, description, color picker, icon, workspace
- Edit area (click to edit inline or dialog)
- Delete area (with confirmation — "This will unlink X tasks and Y projects")
- Area detail page: shows linked projects and tasks
- Status: Active / Archived
- Default areas seeded per workspace (8 Core Concepts)

**Projects (`app/projects/page.tsx` + `[id]/page.tsx`):**
- Create project dialog: name, description, area (dropdown), start/end dates, budget, status, region (KORUS only)
- Edit project — all fields editable
- Delete project (with confirmation)
- Project statuses: Planning → Active → On Hold → Completed → Archived
- Project detail page: overview cards (progress %, budget, dates), linked tasks list, linked contacts
- Progress bar based on % of tasks completed

**Tasks (`app/tasks/page.tsx` + task dialog):**
- Task dialog must have ALL fields editable:
  - Title, description (rich text or markdown)
  - Status (workspace-specific dropdown)
  - Priority (urgent, high, medium, low)
  - Impact (high, medium, low)
  - Effort (high, medium, low)
  - Urgent checkbox ⚡
  - Important checkbox ⭐
  - Due date (custom date picker, not native input)
  - Assignee (dropdown of users)
  - Tags (multi-select, custom tags)
  - Area (dropdown)
  - Project (dropdown)
  - Sprint (dropdown)
  - Region (KORUS only)
- Delete task (with confirmation)
- Bulk actions: select multiple → change status / delete / assign

**Verify:** Create an area → create a project under it → create tasks under the project → edit each → delete one → all CRUD works. Check area detail shows linked items.

### 4. Tables / Bases Section (Custom Databases)

**NEW section: `app/bases/page.tsx`**
- Add "Bases" to sidebar navigation (icon: Database or Table2)
- Concept: user-created databases/tables that can hold structured data
- Each "base" has:
  - Name and description
  - Custom columns (fields) defined by the user:
    - Text, Number, Date, Select (single), Multi-select, Checkbox, URL, Email, Person, Relation
  - Rows of data
  - Can be linked to tasks, projects, or areas via a relation column

**Schema addition needed:**
```sql
bases (id, workspaceId, name, description, schema JSONB, createdAt, updatedAt)
base_rows (id, baseId, data JSONB, createdAt, updatedAt)
```
- `schema` stores column definitions: `[{name, type, options?}]`
- `data` stores row values: `{columnName: value}`

**UI:**
- Base list page: cards showing name, column count, row count
- Base detail page: spreadsheet-like table view
  - Column headers from schema
  - Inline editing of cells
  - Add row button
  - Add column button (opens column config dialog)
  - Delete row, delete column
  - Sort by any column
  - Filter by column values
- Create base dialog: name, description, initial columns
- Link to entity: "Link to Project" button → creates a relation

**API routes needed:**
- `/api/bases` (GET list, POST create)
- `/api/bases/[id]` (GET, PATCH, DELETE)
- `/api/bases/[id]/rows` (GET list, POST create)
- `/api/bases/[id]/rows/[rowId]` (PATCH, DELETE)

**Verify:** Create a base called "Equipment" with columns: Name (text), Cost (number), Status (select: Available/In Use/Repair). Add 3 rows. Edit a cell inline. Sort by cost. Link base to a project.

---

## ALSO FIX (from audit)

### 5. Obsidian Backup Button in Settings
- Add "Backup to Obsidian" button in Settings page
- Shows last backup time
- Triggers `/api/backup/obsidian` POST
- Shows success/error toast

### 6. Sidebar — Add Missing Nav Items
Ensure sidebar has ALL these in order:
Home, Tasks, Kanban, Matrix, Projects, Areas, Sprints, CRM, Notes, Bases, Documents, Messages, Brief, Metrics, Settings

---

## Completion Protocol

After each major feature (1-6):
1. Write status to `/tmp/dashboard-v4-status.txt`
2. `git add -A && git commit -m "feat: <descriptive message>"`

When ALL done:
1. `npm run build` — must pass clean
2. Write "PHASE_7_COMPLETE" to `/tmp/dashboard-v4-status.txt`
3. `git add -A && git commit -m "feat: v4 Phase 7 — Oli feedback: CRUD, roles, Eisenhower, Bases"`
4. Run: `openclaw system event --text "Done: Phase 7 — Eisenhower matrix, user roles, full CRUD, custom Bases, all Oli feedback addressed" --mode now`
