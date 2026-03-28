# Phase 8 — Oli's Direct Feedback (Bug Fixes + UX Improvements)

Read .interface-design/system.md for design tokens. These are direct feedback items from the product owner — every one must be fixed properly.

---

## 1. NOTES: "/" Key Conflict with Command Palette

**Bug:** Pressing "/" anywhere triggers the Cmd+K command palette instead of BlockNote's slash command menu.

**Fix:** The command palette keyboard listener must NOT capture "/" when:
- Focus is inside a BlockNote editor
- Focus is inside any input, textarea, or contenteditable element

In `components/command-palette.tsx`:
- Check `document.activeElement` — if it's an input, textarea, or has `contenteditable="true"`, or is inside a `[data-blocknote]` or `.bn-editor` container, do NOT open the command palette
- Only open command palette on "/" when focus is on the page body or non-interactive elements
- Cmd+K should ALWAYS work regardless of focus (that's the primary shortcut)

**Verify:** Open Notes → click into editor → press "/" → BlockNote slash menu appears (NOT command palette). Press Cmd+K → command palette opens.

---

## 2. SETTINGS: Username Input Loses Focus

**Bug:** When creating a new user in Settings, typing a letter causes the input to lose focus. User has to click back into the field after each keystroke.

**Fix:** This is almost certainly caused by the component re-rendering on every keystroke and recreating the input element. Common causes:
- State update triggers full component re-render
- Input is inside a component that gets a new key on each render
- Form component is defined inline inside the render function

Solution:
- Extract the user creation form into its own component (if not already)
- Use `useState` for form fields WITHOUT triggering parent re-render
- Make sure input elements have stable keys
- Use uncontrolled inputs with refs, OR ensure controlled inputs don't cause parent to re-mount

**Verify:** Open Settings → User Management → type a full email address smoothly without cursor jumping. Create user works end-to-end.

---

## 3. TASKS: Status Dropdown Shows Wrong Options

**Bug:** Task status dropdown shows project phases instead of task statuses.

**Fix:** Task statuses should be universal across all workspaces:
- **Backlog** — not started, in the queue
- **To Do** — committed to doing soon
- **In Progress** — actively being worked on
- **Needs Review** — done but needs checking
- **Done** — completed
- **Cancelled** — not doing anymore

Update `types/index.ts` — change `WORKSPACE_STATUSES` to use these universal task statuses for ALL workspaces. The workspace-specific statuses (Lead, Qualification, Pre-Prod, etc.) are for PIPELINE/CRM stages, NOT for tasks.

Update everywhere that references task statuses:
- Task list page
- Task dialog
- Kanban columns
- Eisenhower matrix
- Home dashboard stat calculations
- Any status filter

**Verify:** Create a task in any workspace → status dropdown shows: Backlog, To Do, In Progress, Needs Review, Done, Cancelled.

---

## 4. TASKS: Remove Priority Property

**Bug:** Priority field (urgent/high/medium/low) is redundant when we have Urgent + Important checkboxes for Eisenhower prioritization.

**Fix:**
- Remove the `priority` dropdown from the task creation/edit dialog
- Remove priority column from task list table
- Remove priority filter from filter bar
- Keep the `priority` column in the DB schema (don't drop it — backwards compat) but don't show it in UI
- Priority dots on kanban cards should instead show urgent/important indicators (⚡/⭐)

**Verify:** Open task dialog → no priority dropdown. Kanban cards show ⚡ and ⭐ badges instead of priority dots.

---

## 5. TASKS: Kanban "New Task" Must Match List View Dialog

**Bug:** The "New Task" button in Kanban view opens a minimal form that's missing project and area allocation fields.

**Fix:** Both the Kanban "New Task" button and the Task List "New Task" button must open the SAME `TaskDialog` component with ALL fields. The only difference is Kanban pre-fills the status based on which column the + button is in.

- In `app/tasks/kanban/kanban-client.tsx`, replace any inline task creation form with `<TaskDialog>` component
- Pass `defaultStatus` prop to pre-fill the column's status

**Verify:** Click "+" on a Kanban column → full task dialog opens with ALL fields (including project, area, sprint, tags, etc.) and status pre-filled to that column's status.

---

## 6. TASKS: Project OR Area Allocation (Not Both)

**Rule:** A task must be assigned to a **Project** first. Only if no project is selected can it be assigned to an **Area** as fallback.

**Fix in TaskDialog:**
- Show Project dropdown first
- If a project is selected:
  - Auto-populate the Area field from the project's area (read-only, grayed out)
  - Hide or disable the Area dropdown
- If no project is selected:
  - Show the Area dropdown as a fallback
  - Label it clearly: "Area (when no project)"
- API validation: if both `projectId` and `areaId` are provided, AND the project already has an area, ignore the manually set areaId and use the project's area

**Verify:** Create task → select a project that belongs to an Area → Area auto-fills and is disabled. Create task → leave project empty → Area dropdown is active.

---

## 7. TASKS: All Fields Mandatory on Creation

**Fix:** When creating a new task, the following fields must be required (form won't submit without them):
- Title (required)
- Status (required — default to "Backlog")
- Workspace (required — use current workspace)
- Urgent checkbox (required — default false)
- Important checkbox (required — default false)
- Due date (required)
- Assignee (required)
- Project OR Area (required — at least one)
- Tags (required — at least one tag)

Show validation errors inline next to each empty required field. Submit button disabled until all required fields are filled.

**Verify:** Open new task dialog → try to submit with empty fields → validation errors shown. Fill all fields → submit works.

---

## 8. TASKS: Description Should Be a BlockNote Editor

**Fix:** The task description field should NOT be a plain textarea. Replace it with an embedded BlockNote editor (same as Notes page).

- In `TaskDialog`, replace the description textarea with a BlockNote editor instance
- Store description as JSONB (blocks format) in `tasks.description`
- Also generate `descriptionPlaintext` for search indexing
- The editor should be compact (max-height with scroll) inside the dialog
- Support: headings, paragraphs, bullets, numbered lists, checklists, code blocks, callouts

Wait — the `description` column is currently `text` type. We need to handle both:
- If description is a string (old format), render as plain text
- If description is JSON (new format), render in BlockNote
- On save, always save as JSON blocks format

**Verify:** Open task dialog → description field is a BlockNote editor with slash commands. Save → reopen → content preserved with formatting.

---

## 9. PROJECTS: Detail Page — Show All Linked Artifacts

**Current:** Project detail page (`app/projects/[id]/page.tsx`) only shows tasks.

**Fix:** Project detail page must show tabs or sections for ALL linked artifacts:
- **Overview** — project name, description (BlockNote), area, status, dates, budget, region (KORUS), progress bar
- **Tasks** — linked tasks list (filterable, sortable)
- **Notes** — notes linked to this project (from notes.projectId)
- **Documents** — placeholder for now, but show section
- **Bases** — bases linked to this project
- **Contacts** — contacts linked to this project

Use tabs component for these sections. Each tab shows the relevant data with "Add" buttons.

Also show:
- The **Area** this project belongs to (clickable link to area page)
- The **description** rendered below the title (BlockNote, editable inline)

**Verify:** Open a project → see all tabs. Notes tab shows linked notes. Area is visible and clickable. Description renders with formatting.

---

## 10. PROJECTS: Description as BlockNote Editor

Same as tasks — project description should be a BlockNote editor, not a plain textarea.

- In project create/edit dialog AND project detail page
- Store as JSONB in `projects.description` column
- Handle migration: existing string descriptions render as plain text, new saves use JSON blocks
- Project detail page shows the description below the title, editable inline (click to edit)
- This description note should ALSO appear in the project's Notes tab (as a "pinned" project note)

**Verify:** Open project → description is a rich editor. Edit with slash commands → saves. Check Notes tab → project description appears as pinned note.

---

## Completion Protocol

After fixing each item (1-10):
1. Write status to `/tmp/dashboard-v4-status.txt`
2. `git add -A && git commit -m "fix: <descriptive message>"`

When ALL 10 items are done:
1. `npm run build` — must pass clean
2. Write "PHASE_8_COMPLETE" to `/tmp/dashboard-v4-status.txt`
3. `git add -A && git commit -m "feat: v4 Phase 8 — Oli UX feedback, task statuses, BlockNote descriptions, project artifacts"`
4. Run: `openclaw system event --text "Done: Phase 8 — all Oli feedback addressed: slash key fix, task statuses, mandatory fields, BlockNote descriptions, project artifacts" --mode now`
