# Phase 9 — Bug Fixes + Core Features Completion

Read .interface-design/system.md for design tokens. Read SPEC.md for context.

**This phase has 3 sections: Critical Bugs, Task/Project/Area improvements, and Sprint/CRM completion.**

---

## SECTION A: CRITICAL BUGS (Fix First)

### A1. Workspace Filtering Broken

**Bug:** Switching workspaces doesn't filter data. Tasks/projects/notes from all workspaces show up together.

**Fix:** Every page that loads data must pass the current workspace to the API query.
- Check EVERY page component: does it read the workspace from the WorkspaceSwitcher context/hook?
- Check EVERY API call: does it include `?workspace=X` parameter?
- Check EVERY server component: does it filter by `eq(table.workspaceId, workspace)`?
- The workspace switcher must update a URL search param or context that triggers data refetch
- Areas, projects, tasks, notes, sprints, contacts, organisations, bases — ALL must filter

**Verify:** Create a task in Byron Film. Switch to KORUS. Task must NOT appear. Switch back to Byron Film. Task appears.

### A2. Tasks Not Persisting After Refresh

**Bug:** Tasks disappear after page refresh.

**Fix:** Debug the create flow:
1. Check POST /api/tasks — is it actually inserting into Postgres? Add console.log.
2. Check the response — does it return the created task with an ID?
3. Check the list page — is it fetching from the API or only reading local state?
4. If the page uses `useState` for tasks, it needs to fetch from API on mount, not just rely on client state.
5. Ensure `db.insert()` is awaited and committed.

**Verify:** Create a task. Hard refresh the page (Cmd+Shift+R). Task still there. Close browser, reopen. Task still there.

### A3. Region Still Showing in BF & Personal

**Bug:** Region field appears in task/project forms for Byron Film and Personal workspaces.

**Fix:** In TaskDialog and Project creation dialog:
```
{workspaceId === 'korus' && (
  <RegionSelect ... />
)}
```
Search the ENTIRE codebase for "region" — every UI instance must be wrapped in a KORUS-only conditional. This includes:
- Task dialog
- Task list columns/filters  
- Project dialog
- Project list columns/filters
- Any detail pages

**Verify:** Switch to Byron Film → open new task → NO region field. Switch to KORUS → region field visible.

### A4. Task Dialog Field Layout

**Fix:** Reorganize the task creation/edit dialog fields in this order:

```
Row 1: Title (full width)
Row 2: [Status dropdown] [Due Date picker]
Row 3: [Assignee dropdown] [Tags multi-select]
Row 4: [Project dropdown] [Area dropdown - disabled if project selected]
Row 5: [⚡ Urgent] [⭐ Important] side by side | [Impact ▼] [Effort ▼] side by side
Row 6: [Region dropdown - KORUS only]
Row 7: Description (BlockNote editor, full width, expandable)
```

- Use a 2-column grid layout for rows 2-6
- Project/Area mutual exclusion: selecting a project disables area (inherits from project). Selecting an area disables project. Clear button on each.
- Urgent/Important as toggle switches (not checkboxes) with ⚡ and ⭐ icons
- Impact/Effort as small dropdowns (Low/Medium/High)

**Verify:** Open task dialog — fields arranged as above. Select project → area greys out. Select area → project greys out.

---

## SECTION B: PROJECT & AREA IMPROVEMENTS

### B1. Project Creation Dialog — New Fields

Add these fields to the project creation/edit dialog:

```
Row 1: Project Name (full width)
Row 2: [Status dropdown] [Region - KORUS only]
Row 3: [Area dropdown] [Budget input (allows +/- values)]
Row 4: [Project Manager - contact dropdown] [Client - contact dropdown with "+ New" option]
Row 5: [Lead Gen contact - optional, with "+ New" option]
Row 6: Description (BlockNote editor)
```

**Project Manager:** Dropdown of contacts in the workspace. Shows name + role.
**Client:** Same dropdown + a "+ Create New Contact" option at the bottom that opens a mini contact creation inline form.
**Lead Gen:** Optional, same as Client dropdown.

Schema changes needed:
- Add `projectManagerId` (uuid, nullable, references contacts)
- Add `clientId` (uuid, nullable, references contacts)  
- Add `leadGenId` (uuid, nullable, references contacts)
- Add `milestones` table: `id, projectId, title, date, status (pending/completed), createdAt, updatedAt`
- Add `bookmarks` table: `id, projectId, title, url, createdAt` (for hyperlinks)

**Budget:** Allow negative values (cost) and positive (revenue opportunity). Format with currency: "$12,500" or "-$3,200".

**Start date:** Remove from dialog. Auto-set to `createdAt`. If user needs a specific start, they create a "Project Start" milestone instead.

**Verify:** Create project → assign project manager + client from contacts → add budget as -5000 → saves correctly.

### B2. Project Milestones

New section on project detail page (Overview tab):

- "Milestones" card with a vertical timeline
- Each milestone: title, date, status (pending/done checkbox)
- "+ Add Milestone" button opens inline form (title + date)
- Milestones ordered by date
- Overdue milestones highlighted in red
- API: `/api/projects/[id]/milestones` (GET, POST)
- API: `/api/projects/[id]/milestones/[mid]` (PATCH, DELETE)

**Verify:** Open project → add 3 milestones → check one as done → delete one → order by date.

### B3. Project Contact Address Book

New tab on project detail page: "Team"

- List of contacts associated with this project with their role (Team, Client, Contractor, Supplier, Consultant)
- "+ Add Contact" — search existing contacts or create new
- Each contact card: name, role on project, email (mailto link), phone (tel link), company
- "Download VCF" button per contact — generates and downloads a .vcf file:
  ```
  BEGIN:VCARD
  VERSION:3.0
  FN:Name
  TEL:+61...
  EMAIL:email@...
  ORG:Company
  TITLE:Role
  END:VCARD
  ```

Schema: `project_contacts` join table: `id, projectId, contactId, role, createdAt`
API: `/api/projects/[id]/contacts` (GET, POST, DELETE)

**Verify:** Open project → Team tab → add 2 contacts with different roles → download VCF → opens in Contacts app.

### B4. Project Hyperlinks/Bookmarks

New section on project detail page (Overview tab):

- "Links" card with a list of bookmarks
- Each: title + URL (clickable, opens in new tab) + delete button
- "+ Add Link" inline form (title + URL)
- Common presets: "Google Drive", "Slack Channel", "Frame.io", "Xero Project"

Uses the `bookmarks` table from B1.

**Verify:** Add 3 links to a project → click one → opens in new tab → delete one.

### B5. Area Enhancements

**Area detail page (`app/areas/[id]/page.tsx`):**

Add to area schema:
- `context` (text): "Internal" or "External"  
- `spheresOfResponsibility` (text array): tags like "Insurance", "Contracts", "HR", "Design", "Content", "Brand", etc.

Area detail page sections:
- **Overview:** Name, description, context badge (Internal/External), spheres tags
- **Projects:** Active + Archived projects in this area (cards with status badges)
- **Tasks:** All tasks in this area (grouped by status)
- **Calendar:** Timeline view of task due dates + project milestones in this area (simple timeline, not full calendar)

Area creation/edit dialog:
- Name, description, context (Internal/External toggle), spheres of responsibility (multi-select tags, user can create new), workspace, color, icon

**Verify:** Create area with context "External" and spheres "Contracts, Insurance" → open area page → see projects and tasks listed.

---

## SECTION C: SPRINT & CRM COMPLETION

### C1. Sprint Creation Dialog

Add a proper sprint creation dialog:
- Sprint Name (required)
- Start Date (required, date picker)
- Due Date (required, date picker)
- Goal (optional text)
- Workspace (auto from current)

Button: "+ New Sprint" on sprints list page opens this dialog.

**Verify:** Click new sprint → fill form → saves → appears in sprint list with date range.

### C2. Sprint Detail / Burndown Page

Sprint detail page (`app/sprints/[id]/page.tsx`):

**Layout:**
- Left panel (30%): Task list with filters (status, assignee). These are all tasks NOT in the sprint. Drag from here into the sprint.
- Right panel (70%): Sprint board
  - Burndown chart at top (Recharts LineChart: ideal vs actual)
  - Kanban columns below: To Do | In Progress | Done
  - Drag tasks between columns (updates status)
  - Drag tasks FROM left panel INTO sprint (assigns sprintId)

Sprint task assignment: when a task is dragged into the sprint board, PATCH the task's `sprintId`.

**Verify:** Open sprint → drag a task from the left panel into the sprint → it appears in the kanban. Drag between columns → status updates. Burndown chart shows progress.

### C3. CRM — Rename to "Contacts"

- Rename sidebar nav item from "CRM" to "Contacts"
- Update all references

### C4. Contact Creation Dialog

Proper contact creation with these fields:
```
Row 1: [First Name] [Last Name]
Row 2: [Position/Title] [Organisation dropdown + "New" option]
Row 3: [Mobile] [Email]
Row 4: [Address (full width)]
Row 5: [LinkedIn URL] [Instagram URL]
Row 6: [Facebook URL] [Portfolio/Website URL]
Row 7: [Pipeline Stage dropdown] [Tags multi-select]
Row 8: [Notes (text area)]
```

**Log Action:** After creating a contact, auto-log to activity_log: "Created contact: First Last"

Schema additions to contacts:
- `firstName` (text) + `lastName` (text) — replace single `name` field (or keep `name` as computed)
- `linkedinUrl` (text)
- `instagramUrl` (text)
- `facebookUrl` (text)
- `portfolioUrl` (text)
- `mobile` (text) — separate from `phone`

**Verify:** Create contact with all fields filled → appears in list → activity logged.

### C5. Contacts Page — List View

Redesign contacts page as a list/table view:

- **Quick search bar** at top (filters by name, email, company)
- **Columns:** Name (first + last), Position, Mobile (tel: link), Email (mailto: link), Website/Portfolio (link), LinkedIn (icon link), Instagram (icon link)
- Click row → contact detail page
- Pipeline stage badge on each row
- Workspace filter active

**Verify:** Add 3 contacts → search by name → results filter. Click mobile number → phone dialer opens. Click email → mail client opens.

### C6. Organisation Creation Dialog

```
Row 1: Organisation Name (full width)
Row 2: [Industry] [Size (employees)]
Row 3: [Website] [Email]
Row 4: [Phone] [Address]
Row 5: [Pipeline Stage] [Tags]
Row 6: [Notes]
```

### C7. Organisations Page — Card View

- **Quick search bar** at top
- **Card layout** (not table): each card shows:
  - Organisation name (large)
  - Industry badge
  - Website link
  - Linked contacts (clickable avatars/names)
  - Pipeline stage badge
- Click card → organisation detail page (with linked contacts, projects, activity)

**Verify:** Create org → add 2 contacts to it → org card shows contact names. Click contact → goes to contact page.

### C8. Pipeline Stages

Universal pipeline stages for CRM:
```
Lead → Qualified → Proposal → Signature → Won → Lost → On Hold
```

Each stage has a "Next Reach Date" field — when should we follow up?

Add `nextReachDate` (date, nullable) to contacts schema.

Pipeline view (existing from Phase 7): kanban columns = these stages. Contact cards show next reach date.

**Verify:** Create contact with stage "Lead" and next reach date → appears in pipeline board → drag to "Qualified" → stage updates.

---

## Completion Protocol

After each section (A, B, C):
1. Write status to `/tmp/dashboard-v4-status.txt`
2. `git add -A && git commit -m "feat: <descriptive message>"`

When ALL done:
1. `npm run build` — must pass clean
2. Write "PHASE_9_COMPLETE" to `/tmp/dashboard-v4-status.txt`
3. `git add -A && git commit -m "feat: v4 Phase 9 — bugs fixed, projects enhanced, sprints + CRM complete"`
4. Run: `openclaw system event --text "Done: Phase 9 — workspace filtering, persistence, projects with milestones/contacts/bookmarks, sprints with burndown, CRM with contacts/orgs/pipeline" --mode now`
