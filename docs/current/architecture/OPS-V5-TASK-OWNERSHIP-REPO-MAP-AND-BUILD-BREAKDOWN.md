# OPS v5 — Task Ownership Repo Map and Build Breakdown

**Date:** 2026-03-30  
**Status:** Implementation planning based on current Cockpit repo state  
**Purpose:** Map the task ownership / hierarchy / operational execution plan onto the current Cockpit codebase, identify what already exists, what is missing, and define a grounded build breakdown for Devon / Claude Code.

---

# 1. Executive Summary

The good news is that Cockpit already has a strong part of the spine in place.

## Already true in the current repo
- `activity_log` already exists as the **canonical event spine candidate**
- `activity_log` already includes a **pgvector embedding column**
- embeddings are already being generated asynchronously through `lib/embeddings.ts`
- semantic search already queries `activity_log`
- `agent_actions` already dual-write into `activity_log`
- OPS v5 canonical event fields are already present in schema and migrations
- the repo already has an `operators` table scaffold, expanded task ownership fields, and a `task_events` table scaffold

## Not yet true in the current repo
- tasks are still missing first-class hierarchy fields such as `parent_task_id`
- the current UI is still largely flat-task oriented
- the current task dialog does not support parent/child structure, hierarchy toggles, or rollup display
- there is no hierarchy-aware prioritisation behavior inside the operational task system
- there is no dedicated parent/subtask rollup model for blockers, progress, overdue children, or next action
- there is no source-linked intake layer that decides whether work should create a parent task or a subtask
- there is no reconciliation queue for hierarchy mismatch / stale structured work

## Main conclusion
The vector/logging side is **further along than the task hierarchy side**.

The next build should therefore focus on making the **task model, hierarchy model, ownership model, and lifecycle flows** catch up with the operational spine that already exists.

---

# 2. What I inspected

## Docs reviewed
- `docs/current/architecture/OPS-V5-TASK-HIERARCHY-DECISION-NOTE.md`
- `docs/current/architecture/OPS-V5-INTAKE-ROUTING-AND-EXECUTION-MODEL.md`
- `docs/current/architecture/OPS-V5-ROLLOUT-PLAN-CHARLIE-DEVON-CLAUDE.md`
- `docs/current/architecture/OPS-V5-TASK-OWNERSHIP-AND-EXECUTION-PLAN.md`

## Core repo files inspected
- `lib/db/schema.ts`
- `lib/activity.ts`
- `lib/embeddings.ts`
- `lib/search.ts`
- `app/api/tasks/route.ts`
- `app/api/agent-actions/route.ts`
- `app/tasks/tasks-client.tsx`
- `components/task-dialog.tsx`
- `lib/priority-engine.ts`
- `app/tasks/priority/priority-client.tsx`

---

# 3. Current State — What Exists Today

## 3.1 Canonical logging and embeddings are already partially implemented

### Evidence
In `lib/db/schema.ts`, `activity_log` already includes:
- canonical OPS v5 actor fields
- event family / event type / status / source fields
- approval and productivity fields
- `embedding` vector column
- `embedding_model`

### Embedding pipeline
In `lib/activity.ts`:
- every `logActivity()` write can trigger asynchronous embedding generation
- text used for embeddings is built from action/entity/title/description

In `lib/embeddings.ts`:
- embeddings use **OpenAI `text-embedding-3-small`**
- vectors are written back into `activity_log.embedding`

In `lib/search.ts`:
- text search already hits tasks/projects/notes/contacts/activity logs
- semantic search already runs against `activity_log.embedding`
- vector distance search is done in Postgres/pgvector

## Operational meaning
The canonical event spine is already credible.
The missing work is not “more retrieval infrastructure.”
It is hierarchy-aware operational discipline.

---

## 3.2 Task schema is partway upgraded but still not hierarchy-complete

### Evidence
The current `tasks` table already includes:
- `assigneeType`
- `assigneeId`
- `assigneeName`
- `supervisorId`
- `supervisorName`
- `executionMode`
- source metadata fields
- lifecycle metadata fields
- review fields
- artifact fields

### Missing for target model
Tasks do **not yet** include the core hierarchy fields needed for the new parent/subtask model, such as:
- `parentTaskId`
- `sequenceIndex`
- optional `hierarchyDepth`
- optional `isMandatoryChild` / equivalent completion semantics
- optional derived/denormalized rollup helpers if we choose to store them

## Operational meaning
The repo has made good progress on ownership discipline, but not yet on hierarchy discipline.
That is now the key schema bottleneck.

---

## 3.3 Task events exist, but parent/child semantics do not yet exist

### Evidence
`task_events` already exists as a structured lifecycle audit layer.

### Missing
It does not yet appear to carry hierarchy-specific meaning such as:
- subtask created under parent
- parent rollup updated
- child blocker escalated parent state
- parent auto-moved to review after all children complete

## Operational meaning
This is good news.
We do not need to invent a new audit model.
We need to extend the existing one to understand parent/child behavior.

---

## 3.4 Task API is upgraded for ownership, but not yet for hierarchy

### Evidence
`app/api/tasks/route.ts` already supports richer task creation metadata and logs into both:
- `task_events`
- `activity_log`

### Missing
The create path does not yet clearly support:
- parent task creation with child structure intent
- subtask creation with `parentTaskId`
- hierarchy validation
- prevention of accidental deep-nesting in UI flows
- rollup updates when child state changes

There is also still a need for a dedicated hierarchy-aware task update path if not already present elsewhere.

## Operational meaning
The task API has moved beyond “create-only flat task thinking,” but it has not yet become a true hierarchy-aware execution contract.

---

## 3.5 Agent actions are ahead of hierarchy-aware task execution

### Evidence
`app/api/agent-actions/route.ts` already:
- accepts agent actions
- stores them in `agent_actions`
- dual-writes them into `activity_log`
- captures agent identity and source URL

## Missing
We still need to ensure agent work can answer:
- what parent task is this inside?
- what subtask is the agent actually executing?
- what parent rollup should update when this child changes state?

## Operational meaning
The system already logs agent behavior better than it structures agent task execution inside the new hierarchy.
That is backwards for the target model.

---

## 3.6 UI is still flat-task oriented

### Evidence
`app/tasks/tasks-client.tsx` currently:
- treats tasks as a flat list with grouping options
- lets users group by project / status / assignee / space
- provides inline edits for status / due date / assignee
- does not yet surface parent-child expand/collapse behavior
- does not yet display parent rollups
- does not yet distinguish strategic parent views from execution child views

`components/task-dialog.tsx` currently:
- supports task creation/editing for flat tasks
- does not support parent selection
- does not support subtask creation mode
- does not expose hierarchy depth / sequence / dependency hints
- does not expose parent/child aware controls

## Operational meaning
Even if the schema were extended tomorrow, the UI would still need a serious pass to become a real hierarchy-aware cockpit rather than a generic task board.

---

## 3.7 The priority engine exists and must not be broken by subtasks

### Evidence
`lib/priority-engine.ts` already scores work using:
- project tiering
- urgency logic
- importance logic
- effort bands
- impact bands
- blocking / critical path flags
- cross-project ranking

`app/tasks/priority/priority-client.tsx` already presents:
- strategic board views
- project health
- allocation views

## Operational meaning
This is critical.
Subtasks must be introduced in a way that preserves the existing prioritisation workflow.

That means:
- **parent tasks remain the prioritisation objects**
- **subtasks inherit parent priority context by default**
- **child state affects parent visibility indirectly**

If we ignore that, we will flood the main board with duplicate urgency and destroy the signal.

---

# 4. Gap Analysis — What Must Change

## Gap A — Hierarchy model gap
Current system has richer ownership but still lacks a first-class parent/subtask structure.

## Gap B — Priority-safety gap
Current prioritisation engine is useful, but it is not yet protected from hierarchy-induced noise.

## Gap C — Rollup gap
Current system does not yet visibly support parent rollups such as:
- completed child count
- blocked child count
- overdue child count
- next actionable child
- parent at-risk state

## Gap D — Intake hierarchy gap
Current task creation flows do not yet explicitly decide:
- parent task vs subtask
- whether a new message should create a child under existing work
- when ambiguity should result in draft placement rather than silent misclassification

## Gap E — Execution contract gap
Current agent logging exists, but child-level execution and parent-level escalation are not yet clearly encoded.

## Gap F — Product/UI gap
Current task surfaces do not yet represent Cockpit as:
- a parent-first review system
- with expandable child execution detail
- and toggle-based hierarchy views

---

# 5. Recommended Database Changes

## 5.1 Extend `tasks` with hierarchy fields

### Add core hierarchy fields
- `parentTaskId`
- `sequenceIndex`
- optional `hierarchyDepth`
- optional `sortKey` for stable child ordering

### Why
This is the minimum needed to support:
- parent-child structure
- ordered subtasks
- expand/collapse UI
- future generic nesting

## 5.2 Decide whether rollups are computed or stored

### Recommended default
Compute rollups where practical rather than storing too many denormalized counters too early.

### Rollups needed conceptually
- child count
- completed child count
- blocked child count
- overdue child count
- next actionable child
- parent health state

If performance demands it later, denormalized rollup fields can be added.

## 5.3 Extend `task_events` for hierarchy-aware lifecycle semantics

### Add or standardize event types such as
- `subtask_created`
- `task_parent_changed`
- `task_rollup_updated`
- `parent_at_risk`
- `parent_ready_for_review`

### Why
This provides a clean source for:
- task timelines
- hierarchy audits
- rollup reasoning
- later retrieval and analytics

---

# 6. Recommended API Changes

## 6.1 Extend task creation flow for hierarchy-aware creation

### `POST /api/tasks`
Should support:
- parent task creation
- subtask creation under `parentTaskId`
- optional child ordering metadata
- object role (`parent` / `child`) if useful in API shape

### Validation rules
- reject self-parenting
- prevent invalid parent references
- prevent child creation under unsupported object types if needed
- optionally enforce UI/business max-depth while keeping schema generic

## 6.2 Add hierarchy-aware task update endpoint behavior

### `PATCH /api/tasks/[id]`
Should support:
- assignment updates
- status changes
- parent changes where allowed
- child ordering changes
- blocked reason changes
- review-related fields
- artifact linkage
- rollup recomputation or rollup-triggering behavior

### Required logic
When a subtask changes, the system should be able to:
- update child timestamps
- log child lifecycle event
- recompute or queue recomputation of parent rollup state
- escalate parent state when a child blocker/overdue condition matters

## 6.3 Add hierarchy-aware intake route(s)

### Recommended first intake route
- `POST /api/intake/task`

### Responsibilities
- accept source payload from Slack/manual/email/forms
- classify actionability
- create draft or real task
- decide whether work should become a parent or child
- attach source metadata
- write intake event to `activity_log`

---

# 7. Recommended UI Changes

## 7.1 Task list becomes hierarchy-aware
Update `app/tasks/tasks-client.tsx` to support:
- parent-first default list behavior
- expand/collapse toggles on parent rows/cards
- inline child visibility beneath parents
- parent rollup indicators
- child state summaries
- strategic vs execution-friendly display modes

## 7.2 Task dialog becomes parent/child aware
Update `components/task-dialog.tsx` to support:
- create parent task
- create subtask under existing parent
- parent selector
- child ordering / sequence hints
- parent context display when editing a subtask

## 7.3 Task detail / timeline becomes the execution surface
Add or extend a task detail surface to show:
- parent metadata
- ordered child subtasks
- assignment history
- status changes
- progress notes
- artifacts
- source request context
- review actions

## 7.4 Priority views remain parent-first
Update priority surfaces to ensure:
- main strategic boards remain parent-level by default
- child work does not flood top-level ranking
- rollup health is visible without exploding the list

## 7.5 Governance queue views
Add views for:
- unregistered work
- unassigned tasks
- stale in progress
- blocked too long
- hierarchy mismatch
- parents done with active children

---

# 8. Logging and Retrieval Alignment

## What is already aligned
Current repo already uses:
- `activity_log` as the semantic retrieval source
- pgvector
- OpenAI embeddings
- activity dual-write for agent actions
- task lifecycle dual-write foundations

## What still needs alignment
Hierarchy-aware task lifecycle updates must also write canonical events in a structured way.

### Required event examples
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

## Why
Then retrieval, logs, metrics, and operational visibility all point to the same event spine.

---

# 9. Recommended Build Sequence (Repo-Grounded)

## Build 1 — Hierarchy schema foundation
### Deliverables
- extend `tasks` with hierarchy fields
- add supporting indexes
- decide rollup computation strategy
- extend `task_events` semantics if needed
- generate migration

### Files likely touched
- `lib/db/schema.ts`
- new drizzle migration file
- related type definitions in `types`

### Acceptance criteria
- repo compiles
- migration applies cleanly
- existing task reads still work
- parent-child relations can be represented safely

---

## Build 2 — Hierarchy-aware task lifecycle API
### Deliverables
- extend task create flow to support parent/child structure
- add or harden `PATCH /api/tasks/[id]`
- add rollup recomputation logic
- log structured hierarchy lifecycle events

### Files likely touched
- `app/api/tasks/route.ts`
- `app/api/tasks/[id]/route.ts`
- `lib/task-lifecycle.ts`
- `lib/activity.ts`
- optional hierarchy helper module

### Acceptance criteria
- parent task can be created cleanly
- subtask can be created under a parent
- child status change updates parent visibility correctly
- every meaningful lifecycle change writes to `activity_log`

---

## Build 3 — Priority-safe hierarchy behavior
### Deliverables
- preserve current priority engine semantics
- define how parent tasks enter ranking
- ensure child state affects parent signal indirectly
- prevent top-level queue spam from children

### Files likely touched
- `lib/priority-engine.ts`
- task ranking queries or adapters
- priority UI components

### Acceptance criteria
- parent tasks remain the strategic objects
- child tasks do not pollute top-level ranking by default
- blockers and overdue children surface through parent rollups

---

## Build 4 — Operator-aware hierarchy UI
### Deliverables
- replace flat list assumptions with hierarchy-aware rendering
- add expand/collapse toggles
- expose parent rollups
- add child creation/edit flows
- preserve inline speed where useful

### Files likely touched
- `app/tasks/tasks-client.tsx`
- `components/task-dialog.tsx`
- relevant detail components/types

### Acceptance criteria
- user can see parent tasks and toggle open child subtasks
- user can create/edit subtasks under a parent
- UI remains readable and fast

---

## Build 5 — Intake v1 with parent/child decisioning
### Deliverables
- create intake endpoint for Slack/manual source payloads
- create draft-task handling for ambiguous items
- persist source metadata to tasks
- decide parent vs child placement
- log intake event to `activity_log`

### Files likely touched
- new `app/api/intake/task/route.ts`
- shared classification helper(s)
- task creation flow

### Acceptance criteria
- supported intake payload can create a source-linked parent or child task
- source message metadata is visible on the task record

---

## Build 6 — Agent execution contract for hierarchy
### Deliverables
- add task-id-aware agent update flow
- support child-level execution by agents
- ensure parent escalation from child blockers
- optionally connect `agent_actions` to both task id and parent id context

### Files likely touched
- `app/api/agent-actions/route.ts`
- task event endpoint or task PATCH path
- schema if explicit task linkage is added to `agent_actions`

### Acceptance criteria
- agent work can be traced to the exact task/subtask it is executing
- parent impact is visible without reading markdown

---

## Build 7 — Governance queues
### Deliverables
- stale task detection
- ownerless task detection
- blocked-too-long detection
- hierarchy mismatch detection
- parent done / child active mismatch detection
- queue views in UI

### Acceptance criteria
- operational leaks become visible without manual hunting

---

# 10. Devon / Claude Code Ticket Breakdown

## Ticket 1 — Add hierarchy fields to task model
**Goal:** make tasks capable of being parents or children.

### Scope
- add `parentTaskId`
- add child ordering metadata
- add indexes and migration

### Done when
- parent-child structure can be represented cleanly in schema and types

---

## Ticket 2 — Build hierarchy-aware lifecycle logic
**Goal:** make child updates affect parent visibility safely.

### Scope
- extend lifecycle helper(s)
- infer hierarchy event types
- recompute parent rollups / state
- log to `task_events` and `activity_log`

### Done when
- child blockers / overdue states can surface at the parent level

---

## Ticket 3 — Upgrade task API for parent/child flows
**Goal:** move from ownership-aware tasks to hierarchy-aware tasks.

### Scope
- extend create payloads
- add parent validation
- harden patch/update behavior
- support subtask creation/editing

### Done when
- parent and child tasks can be created and maintained safely through API

---

## Ticket 4 — Protect the priority engine from hierarchy noise
**Goal:** preserve strategic readability.

### Scope
- parent-first ranking logic
- child inheritance of parent priority context
- parent escalation from child blockers / overdue state

### Done when
- subtasks improve execution but do not pollute top-level priority boards

---

## Ticket 5 — Upgrade task UI to parent/child navigation
**Goal:** make hierarchy visible and usable in Cockpit.

### Scope
- add expand/collapse toggles
- add rollup indicators
- add child creation/edit paths
- preserve existing usability

### Done when
- user can browse parent tasks, toggle children, and drill into execution detail

---

## Ticket 6 — Intake route for source-linked parent/child tasks
**Goal:** turn incoming requests into hierarchy-aware Cockpit tasks.

### Scope
- build `POST /api/intake/task`
- create draft or real task from intake payload
- decide parent vs child placement
- attach source metadata
- log intake event

### Done when
- a Slack/manual payload can become a traceable parent or child task

---

## Ticket 7 — Agent task protocol for subtasks
**Goal:** make agent work flow through visible child execution rather than private notes.

### Scope
- require/encourage `task_id`
- support child-task updates
- connect agent execution updates to parent visibility

### Done when
- Devon/Finn/Hunter/Scout can operate visibly inside the hierarchy

---

# 11. Recommended Immediate Next Step

The correct next move is:

> **Start with Build 1 + Build 2 together as the first implementation checkpoint, but define Build 3 priority-safety rules before coding the hierarchy UI.**

That means:
1. add hierarchy fields
2. harden lifecycle behavior
3. lock parent-first priority semantics
4. then build the UI and intake flows on top

## Why this first
Because once those pieces exist:
- UI work becomes grounded
- intake work has a real target model
- agent integration has a real contract
- governance queues have real hierarchy fields to reason over
- the current priority engine stays intact instead of getting accidentally trashed

Without this, everything else is lipstick on a loosely typed octopus.

---

# 12. Final Conclusion

Cockpit is already partway to the right architecture on the **logging + vector + activity spine** side.

The missing piece is not “more AI.”
The missing piece is **hierarchy-aware operational discipline encoded in the task model**.

So the repo-level strategy is:
- keep `activity_log` as canonical
- keep pgvector in Postgres/Neon
- keep OpenAI embeddings for activity retrieval
- preserve the current priority engine’s strategic logic
- now upgrade tasks into first-class hierarchical operational objects with:
  - real ownership
  - real provenance
  - real lifecycle state
  - real parent/child structure
  - real agent execution visibility
  - real parent rollups and toggle-based UI

That is the bridge from “smart dashboard” to actual Cockpit.
