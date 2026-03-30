# OPS v5 — Build 1 & 2 Implementation Prompt Pack

**Date:** 2026-03-30  
**Status:** Ready for Devon / Claude Code execution  
**Purpose:** Provide grounded implementation prompts for the next major Cockpit checkpoint: hierarchy-aware task schema + parent/subtask lifecycle behavior + priority-safe execution model + canonical event logging alignment.

---

# 1. What this prompt pack is for

This pack is designed to be handed directly to an implementation agent (Devon / Claude Code) so the work begins from the real current Cockpit repo state rather than abstract architecture talk.

## The checkpoint covered here
This pack covers the first hierarchy-aware checkpoint for the task-system rebuild:

### Build 1 — Hierarchy schema foundation
- extend task schema for parent/subtask relationships
- preserve existing ownership/provenance/lifecycle improvements
- add the minimum structure needed for toggle-based hierarchy UI
- extend task event semantics if helpful

### Build 2 — Hierarchy-aware task lifecycle API
- extend task creation to support parent and child tasks
- add or harden structured task update endpoint behavior
- validate hierarchy rules
- dual-write hierarchy-aware lifecycle events into canonical `activity_log`
- compute or trigger parent rollup behavior from child state changes

### Priority safety rule
This checkpoint must preserve the current prioritisation workflow by keeping:
- **parent tasks as the strategic prioritisation objects**
- **subtasks as execution objects**
- **child state influencing parent visibility indirectly**

---

# 2. Repo context for the implementation agent

## Project path
`/Users/charlie/.openclaw/workspace/olivier-marcolin/projects/cockpit/`

## Read these first
- `README.md`
- `docs/INDEX.md`
- `docs/current/architecture/OPS-V5-TASK-HIERARCHY-DECISION-NOTE.md`
- `docs/current/architecture/OPS-V5-INTAKE-ROUTING-AND-EXECUTION-MODEL.md`
- `docs/current/architecture/OPS-V5-ROLLOUT-PLAN-CHARLIE-DEVON-CLAUDE.md`
- `docs/current/architecture/OPS-V5-TASK-OWNERSHIP-AND-EXECUTION-PLAN.md`
- `docs/current/architecture/OPS-V5-TASK-OWNERSHIP-REPO-MAP-AND-BUILD-BREAKDOWN.md`

## Key files already inspected
- `lib/db/schema.ts`
- `lib/activity.ts`
- `lib/embeddings.ts`
- `lib/search.ts`
- `lib/priority-engine.ts`
- `app/api/tasks/route.ts`
- `app/api/agent-actions/route.ts`
- `app/tasks/tasks-client.tsx`
- `components/task-dialog.tsx`

## Important repo truths
- `activity_log` is already the canonical event spine candidate
- pgvector is already in use on `activity_log`
- semantic search already uses `activity_log.embedding`
- ownership fields and `task_events` scaffolding already exist
- tasks do not yet properly support parent/subtask hierarchy
- UI is still mostly flat-task oriented
- the priority engine already exists and must not be polluted by child-task noise

---

# 3. Outcome required from this checkpoint

At the end of this checkpoint, Cockpit should be able to:

1. represent parent tasks and child subtasks through a clean schema
2. create and update parent/child task structures safely through API
3. log meaningful hierarchy-aware lifecycle events into `activity_log`
4. preserve backward compatibility where possible
5. preserve the current strategic prioritisation workflow by keeping parent tasks as the main ranked objects
6. support the next UI checkpoint for toggle-based expand/collapse task views

This checkpoint does **not** need to fully complete:
- full Slack intake automation
- governance queue UI
- full task list redesign
- calendar-native scheduling
- full dependency graph system

Those come later.

---

# 4. Implementation constraints

## Constraints
- preserve current behavior where possible
- avoid breaking existing task list rendering
- use safe nullable/default-backed schema changes
- keep `activity_log` as canonical
- do not invent a second competing logging spine
- do not remove existing fields unless migration is fully handled
- prefer parent-first strategic logic and child-first execution detail

## Principle
This checkpoint should **upgrade the task spine**, not force a dangerous big-bang rewrite.

---

# 5. Deliverables

## Deliverable A — Extend task schema for hierarchy
Extend the `tasks` table to support parent/child structure.

### Required fields
- `parentTaskId` (nullable)
- `sequenceIndex` (nullable or default-backed)

### Optional but useful
- `hierarchyDepth`
- `sortKey`
- `isMandatoryChild`

### Notes
- keep changes backward compatible
- schema may support generic nesting, but product logic should still bias to two levels for now
- add indexes that make parent-child queries efficient

---

## Deliverable B — Extend task event semantics for hierarchy
Use the existing `task_events` table and lifecycle flow to support hierarchy-aware events.

### Suggested event types
- `task_created`
- `subtask_created`
- `task_assigned`
- `task_started`
- `task_blocked`
- `task_unblocked`
- `task_submitted_for_review`
- `task_completed`
- `task_cancelled`
- `task_rollup_updated`
- `parent_at_risk`
- `parent_ready_for_review`

### Why
This gives a clean audit/timeline layer and will make later task detail UI much easier.

---

## Deliverable C — Extend task creation API for parent/child creation
Upgrade `app/api/tasks/route.ts`.

### Requirements
- preserve existing `GET`
- preserve existing `POST` behavior for flat/legacy clients where possible
- extend POST validation to support:
  - `parentTaskId`
  - `sequenceIndex`
  - parent vs child creation semantics
- on task creation:
  - populate hierarchy fields if supplied
  - set `lastActivityAt`
  - create hierarchy-aware `task_events` rows
  - write canonical lifecycle event to `activity_log`

### Validation rules
- reject self-parenting
- reject invalid parent references
- reject impossible hierarchy state
- if product/UI max depth is enforced in API, do it carefully and explicitly

---

## Deliverable D — Add hierarchy-aware task update API
Create or harden `app/api/tasks/[id]/route.ts` with at least `PATCH` support.

### PATCH should support
- assignment updates
- status changes
- blocked reason
- review-related fields
- artifact linkage
- completion summary
- parent reassignment where allowed
- child ordering updates where needed

### PATCH should enforce
- allowed field set
- lifecycle transition validation
- hierarchy validation
- automatic timestamps
- parent rollup recomputation or queued recomputation

### Timestamp expectations
- moving into active work → set `startedAt` if empty
- any meaningful update → update `lastActivityAt`
- moving to done → set `completedAt`
- moving out of done → decide whether to preserve or clear based on explicit rule

---

## Deliverable E — Parent rollup logic
Add shared logic for how child state affects the parent.

### Parent rollup should at least support
- child count
- completed child count
- blocked child count
- overdue child count
- next actionable child
- parent at-risk state

### Core behavioral rules
- all subtasks complete → parent can move to review/done or be marked ready
- blocking child → parent can become at-risk or blocked depending on rule set
- overdue critical child → parent should surface harder in review
- unassigned next-action child → parent should show execution gap

### Important
Child state should influence parent visibility **indirectly** rather than turning every child into a top-level strategic priority object.

---

## Deliverable F — Priority-safe compatibility behavior
Preserve the current prioritisation model.

### Required rule
- **Parent tasks are the strategic prioritisation objects**
- **Subtasks inherit parent priority context by default**
- **Subtasks should not flood the main priority board**

### This means
- do not make every child independently compete in global ranking by default
- let parent visibility be affected by child blockers / overdue state
- preserve current project-tier / urgency / importance / effort / impact logic as the top-level strategic model

---

## Deliverable G — Shared hierarchy/lifecycle helper
Create a helper module, for example:
- `lib/task-hierarchy.ts`
- or extend `lib/task-lifecycle.ts`

### This helper should contain
- parent validation
- hierarchy depth rule(s)
- rollup computation
- child-to-parent state propagation rules
- event-type inference
- compatibility mapping where useful

---

# 6. Suggested technical approach

## Step 1 — Schema changes
- update `lib/db/schema.ts`
- create drizzle migration for hierarchy fields and any supporting indexes

## Step 2 — Shared hierarchy helper
Create a helper module containing:
- parent validation
- rollup logic
- hierarchy event inference
- optional status mapping/compatibility helpers

## Step 3 — Update task POST route
- extend validation
- support parent/child inserts
- write hierarchy-aware event metadata

## Step 4 — Add/harden task PATCH route
- parse patch payload
- load current task
- validate lifecycle + hierarchy transitions
- apply update
- emit canonical event(s)
- update parent rollup state when relevant

## Step 5 — Manual validation
- reason through parent/child create/update flows
- ensure no obvious regression in existing task list/task creation behavior

---

# 7. Suggested API shapes

## POST /api/tasks
Suggested accepted fields include:
- existing fields
- `parentTaskId`
- `sequenceIndex`
- existing ownership/provenance/review fields

## PATCH /api/tasks/[id]
Suggested accepted fields include:
- `status`
- `assigneeType`
- `assigneeId`
- `assigneeName`
- `supervisorId`
- `supervisorName`
- `executionMode`
- `blockedReason`
- `reviewRequired`
- `reviewedBy`
- `artifactUrl`
- `artifactType`
- `artifactStatus`
- `completionSummary`
- `parentTaskId`
- `sequenceIndex`
- `summaryNote`

### Actor identity
If auth/session data is available, use it.
Otherwise allow explicit actor fields for system/agent-driven updates where appropriate.

---

# 8. Acceptance criteria

This checkpoint is successful when all of the following are true:

## Schema
- repo compiles with new schema
- migration applies cleanly
- existing task flows still work

## Data model
- task can exist as a parent or child cleanly
- child can point to parent safely
- task lifecycle and ownership metadata still work

## API
- new parent task can be created
- new subtask can be created under a parent
- existing task can be patched through structured update API
- invalid hierarchy states are rejected
- invalid lifecycle transitions are rejected

## Logging
- hierarchy-aware lifecycle changes emit canonical events to `activity_log`
- no second competing event spine is introduced

## Practical behavior
- child state can influence parent rollup visibility
- parent strategic task remains the thing surfaced at the top level
- subtasks are execution helpers, not top-level board spam

---

# 9. Test checklist

## Manual tests
1. create a parent task with minimal payload
2. create a child subtask under that parent
3. patch child from backlog → in progress
4. patch child from in progress → blocked with reason
5. verify parent becomes at-risk or blocked per implemented rule
6. patch child from blocked → in progress
7. patch child from in progress → awaiting review / review equivalent
8. patch child to done with artifact URL
9. verify parent rollup updates correctly
10. verify `activity_log` has correct hierarchy-aware lifecycle events
11. verify existing task list page still loads
12. verify existing task creation UI is not catastrophically broken

## Regression checks
- activity routes still function
- agent action logging still functions
- semantic search still functions
- repo still builds

---

# 10. Risks to avoid

## Risk 1 — Breaking current UI by forcing hierarchy everywhere at once
Add hierarchy support without requiring the entire UI to be redesigned in this checkpoint.

## Risk 2 — Letting subtasks pollute strategic prioritisation
This is the biggest conceptual risk.
Do not make every child a first-class global priority object by default.

## Risk 3 — Creating duplicate task logging systems
All lifecycle logging should go into `activity_log`.

## Risk 4 — Overbuilding deep nesting or dependency logic too early
Support the schema cleanly, but keep the first checkpoint focused.
Do not drift into full dependency-graph theatre.

---

# 11. Recommended commit structure

Prefer several clean commits rather than one giant blob.

### Suggested sequence
1. `feat(schema): add task hierarchy fields`
2. `feat(api): support parent and subtask lifecycle updates`
3. `feat(logging): emit hierarchy-aware canonical task events`
4. `feat(tasks): add parent rollup logic`

---

# 12. Exact prompt to hand to implementation agent

Use the following prompt verbatim or near-verbatim:

---

## IMPLEMENTATION PROMPT

You are implementing the next hierarchy-aware task checkpoint for OPS v5 — Cockpit.

Work in this repo:
`/Users/charlie/.openclaw/workspace/olivier-marcolin/projects/cockpit/`

Read first:
- `README.md`
- `docs/INDEX.md`
- `docs/current/architecture/OPS-V5-TASK-HIERARCHY-DECISION-NOTE.md`
- `docs/current/architecture/OPS-V5-INTAKE-ROUTING-AND-EXECUTION-MODEL.md`
- `docs/current/architecture/OPS-V5-ROLLOUT-PLAN-CHARLIE-DEVON-CLAUDE.md`
- `docs/current/architecture/OPS-V5-TASK-OWNERSHIP-AND-EXECUTION-PLAN.md`
- `docs/current/architecture/OPS-V5-TASK-OWNERSHIP-REPO-MAP-AND-BUILD-BREAKDOWN.md`

Goal:
Implement the first hierarchy-aware checkpoint for the task-system rebuild.

Required outcomes:
1. Extend the task schema to support parent/subtask relationships.
2. Keep backward compatibility with the current task model where practical.
3. Extend `POST /api/tasks` to support parent and child creation.
4. Add or harden structured `PATCH /api/tasks/[id]` behavior for hierarchy-aware lifecycle updates.
5. Compute or trigger parent rollup behavior when child state changes.
6. Emit canonical hierarchy-aware task lifecycle events into `activity_log`.
7. Preserve the current strategic prioritisation model by keeping parent tasks as the top-level priority objects.
8. Do not let subtasks flood the main board or global ranking by default.

Strongly recommended:
- use the existing `task_events` table for hierarchy-aware audit history
- add a shared helper module for hierarchy validation and rollup logic

Important constraints:
- Do not invent a second logging system.
- Use `activity_log` as the canonical event spine.
- Keep schema changes backward compatible.
- Keep the implementation focused; do not drift into full intake automation, governance queues, or full UI rewrite work in this checkpoint.
- Support generic nesting in schema if useful, but keep product behavior aligned with a practical parent/subtask model.

Deliverables:
- updated `lib/db/schema.ts`
- new drizzle migration(s)
- updated `app/api/tasks/route.ts`
- updated or new `app/api/tasks/[id]/route.ts`
- any helper modules required for hierarchy / lifecycle logic
- optional extension of `task_events` handling where useful

Validate by:
- running build/type checks if available
- manually reasoning through parent + child create/update flows
- ensuring hierarchy-aware lifecycle writes appear in `activity_log`

When done, provide:
- summary of files changed
- schema changes made
- hierarchy/lifecycle rules implemented
- any follow-up work required for UI/intake/governance

---

# 13. Charlie's note

This checkpoint is where Cockpit starts becoming structurally serious about tasks.

The whole point is to stop this pattern:
- work requested in chat
- task vaguely remembered by a human or agent
- execution buried in markdown or local notes
- complex work represented as one mushy flat task
- or worse, dozens of disconnected flat tasks

and replace it with this:
- work enters
- task exists in Cockpit
- owner is explicit
- parent task holds the strategic context
- subtasks hold the execution detail
- progress is visible
- lifecycle is logged
- artifacts are linked
- child blockers can surface parent risk

That is the shift from dashboard to cockpit.
