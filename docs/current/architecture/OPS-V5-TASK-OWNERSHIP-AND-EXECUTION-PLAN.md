# OPS v5 — Task Ownership, Hierarchy, and Execution Plan

**Date:** 2026-03-30  
**Status:** Proposed immediate implementation plan  
**Purpose:** Define how Cockpit becomes the single operational system of record for executable work across humans and agents, using a hierarchy-aware task model that preserves the current prioritisation workflow while making execution clearer and more controllable.

---

# 1. Objective

The objective is still simple:

> **No executable work should exist only in chat, in memory, or in markdown.**

If work is real enough to be executed, tracked, reviewed, blocked, delegated, or completed, it should exist in **Cockpit**.

Markdown remains useful for:
- research
- architecture
- scratch notes
- drafts
- SOPs
- memory and continuity

But markdown should **not** be the authoritative queue for operational execution.

The system goal is to:
- capture work from natural channels,
- register it in Cockpit,
- assign it to a human or agent,
- structure it as parent tasks and subtasks where useful,
- track progress in Cockpit,
- log execution in the canonical event spine,
- and make unfinished work reviewable, reschedulable, and reassignable.

---

# 2. Core Operating Rules

## Rule 1 — Cockpit is the operational source of truth
Slack, email, WhatsApp, Telegram, docs, and verbal planning are intake surfaces.
Cockpit is where work becomes operationally real.

## Rule 2 — No executable task exists only in markdown
Markdown files may reference tasks, expand on them, or contain supporting context.
They must not be the sole place where a live task exists.

## Rule 3 — Every executable task must have a clear owner
Every executable task must be assigned to exactly one primary owner at a time:
- **Oli**
- **Charlie**
- **a named agent** (Devon, Finn, Hunter, Scout, etc.)

Secondary collaborators may exist, but there must be one clear owner.

## Rule 4 — Parent task is the prioritisation and review object
Cockpit will use a hierarchy-aware task model.

For v1, the practical product rule is:
- **Parent task** = strategic, prioritised, reviewable work object
- **Subtask** = execution object beneath the parent

Parent tasks are what should appear in:
- top-level review
- strategic steering views
- scheduling views
- summary dashboards
- prioritisation workflows

## Rule 5 — Subtask is the execution object
Subtasks exist to break parent tasks into actionable work for humans and agents.

They improve:
- delegation
- execution clarity
- handoff quality
- dependency visibility
- progress tracking

They do **not** become separate top-level strategic objects by default.

## Rule 6 — Activity must be visible in Cockpit
Every meaningful state change should update Cockpit.

The canonical task record should reflect when work is:
- draft
- queued
- in progress
- blocked
- awaiting review
- done
- cancelled

## Rule 7 — Lifecycle events belong on the canonical event spine
Task lifecycle events should write to the canonical `activity_log` so that:
- productivity reporting stays coherent,
- logs and retrieval stay aligned,
- vector indexing later attaches to the same event spine,
- parent/child execution remains auditably visible.

---

# 3. Scope

This plan applies to:
- manually created tasks
- tasks derived from Slack or other intake surfaces
- tasks assigned to Charlie
- tasks assigned to Oli
- tasks assigned to named agents
- parent tasks and subtasks
- execution updates from humans or agents
- review, escalation, and reassignment workflows

This plan does **not** require Cockpit to physically store every artifact.
Cockpit remains the orchestration and operational registry layer.
Artifacts may still live in:
- Google Drive
- OneDrive
- iCloud
- Obsidian
- GitHub
- Vercel
- Xero
- Airwallex
- external specialist systems

But Cockpit should know:
- what was requested,
- who owns it,
- what level of the hierarchy it sits at,
- where the artifact lives,
- and what happened.

---

# 4. Target System Behavior

When a message, request, or plan creates real work, the desired flow is:

1. **Intake**
   - request appears in Slack/email/forms/messages/manual entry

2. **Classification**
   - system decides whether it is a:
     - task
     - project
     - event
     - document/artifact request
     - communication action

3. **Registration**
   - a Cockpit record is created or updated

4. **Hierarchy decision**
   - determine whether this should be:
     - a parent task
     - a subtask of an existing parent
     - or a parent task with child subtasks generated later

5. **Assignment**
   - primary owner is set to Oli, Charlie, or a named agent

6. **Execution**
   - work happens in the best-fit execution environment

7. **Status updates**
   - progress changes are pushed back into Cockpit

8. **Artifact linkage**
   - outputs are linked back to the task record

9. **Operational logging**
   - key lifecycle events are written to `activity_log`

10. **Review / reslot / reassign**
   - incomplete work is reviewed and either rescheduled, escalated, or reassigned

---

# 5. Hierarchy Model

## 5.1 Product rule for v1
Cockpit should support generic parent-child relationships in schema, but the practical product behavior for v1 should strongly bias to a two-layer model:
- parent task
- subtask

This avoids over-nesting while preserving flexibility.

## 5.2 Parent task responsibilities
A parent task carries the main planning signal:
- title
- description
- workspace / area / project linkage
- owner
- importance
- urgency
- impact
- overall effort
- due date
- review state
- scheduling relevance
- blocker / critical-path relevance where appropriate
- priority score / rank

## 5.3 Subtask responsibilities
A subtask carries the main execution signal:
- `parent_task_id`
- title
- owner
- status
- local effort estimate
- optional due date
- sequence / dependency metadata
- optional blocking flag
- notes / artifacts / completion summary

Subtasks should support better execution without flooding the strategic views.

## 5.4 Promotion rule
A subtask may be promoted into a full parent task if it becomes independently meaningful, such as when it:
- turns into a large work package,
- requires independent review,
- survives long enough that it is clearly not just a child step,
- or becomes strategically important on its own.

---

# 6. Priority and Review Model

## 6.1 Preserve the current prioritisation workflow
Cockpit already has a prioritisation workflow based on:
- importance
- urgency
- effort
- impact
- project tier / project context
- blocking / critical-path logic

This should remain centered on **parent tasks**.

## 6.2 Parent tasks are scored directly
Parent tasks are the primary objects that should be:
- scored
- ranked
- compared in review
- surfaced in strategic boards
- scheduled into execution time

## 6.3 Subtasks inherit parent priority context
Subtasks should inherit the priority context of the parent by default rather than each becoming a separate top-level scored object.

This preserves signal quality and avoids:
- duplicate urgency
- priority inflation
- unreadable boards
- top-level queue spam

## 6.4 Subtasks influence parent visibility indirectly
Subtask state should be able to affect the parent when it matters.

Examples:
- blocking subtask → parent becomes at-risk or blocked
- overdue critical subtask → parent is surfaced harder in review
- unassigned next-action subtask → parent shows execution gap
- all subtasks complete → parent can move to review or done

## 6.5 Main review stays parent-first
Top-level review views should primarily show:
- parent tasks
- priority
- due date
- owner
- rollup health
- blocker state
- review state

Subtasks should become more visible in execution and detail views.

---

# 7. Data Model Requirements

Cockpit task records should support first-class ownership for both humans and agents, plus hierarchy-aware execution.

## Required task fields

### Identity + source
- `id`
- `title`
- `description`
- `workspace_id` / `workspace_slug`
- `source_type`
- `source_channel`
- `source_message_id`
- `source_url`
- `source_created_at`

### Classification
- `object_type`
- `category`
- `priority`
- `urgency`
- `importance`
- `effort`
- `impact`

### Ownership
- `assignee_type`
- `assignee_id`
- `assignee_name`
- `supervisor_id`
- `supervisor_name`
- `execution_mode`

### Status + execution
- `status`
- `blocked_reason`
- `started_at`
- `completed_at`
- `last_activity_at`
- `next_review_at`
- `due_at`

### Hierarchy + linkage
- `parent_task_id`
- `hierarchy_depth` (optional derived or explicit field)
- `sequence_index` (for ordered subtasks)
- `project_id`
- `area_id`
- `contact_id`
- `event_id`
- `artifact_url`
- `artifact_type`
- `artifact_status`

### Audit + quality
- `created_by`
- `updated_by`
- `review_required`
- `reviewed_by`
- `reviewed_at`
- `completion_summary`

## Recommended rollup fields or computed logic
Whether stored or derived, Cockpit should support parent-level rollups such as:
- subtask count
- completed subtask count
- blocked subtask count
- overdue child count
- next actionable child
- parent health / at-risk flag

---

# 8. Agent Identity Model

Agents should be treated as first-class operators inside Cockpit, not vague background processes.

## Recommended operator model
Create or extend an `operators` model with:
- `id`
- `name`
- `operator_type`
- `role`
- `status`
- `default_supervisor_id`
- `capabilities`
- `workspace_scope`
- `notes`

## Initial operator examples
- Oli — human
- Charlie — human-facing operator surface
- Devon — agent
- Finn — agent
- Hunter — agent
- Scout — agent

## Why this matters
This gives us:
- clean assignee logic
- reporting by operator
- filterable views
- escalation chains
- future automation rules based on operator type/capability

---

# 9. Intake Rules

## MVP intake rule
If a message creates real work, it should create or update a Cockpit task record.

## Supported intake channels for v1
- Slack
- manual entry inside Cockpit
- email
- forms

## Classification targets for v1
- task
- project
- event
- document/artifact request
- communication action

## Intake decision outcomes
For each request, the intake layer should determine:
- is this actionable?
- what object type is it?
- which workspace does it belong to?
- should it become a parent task or a subtask?
- who should own it first?
- does a task already exist?
- does it require confirmation before creation?

## Confirmation policy
Where routing confidence is low or ambiguity is high, the system should create a **draft task** or ask for confirmation rather than silently misfiling work.

---

# 10. Status Update Protocol

Both humans and agents need a strict but lightweight update protocol.

## Allowed status transitions
- `draft -> queued`
- `queued -> in_progress`
- `in_progress -> blocked`
- `blocked -> in_progress`
- `in_progress -> awaiting_review`
- `awaiting_review -> done`
- `awaiting_review -> in_progress`
- `queued -> cancelled`
- `in_progress -> cancelled`

## Every status update should support
- `status`
- `summary_note`
- `updated_by`
- `artifact_url`
- `blocked_reason`
- `next_step`

## Update philosophy
Do not require essays.
Require enough signal to answer:
- what changed?
- what is the current state?
- what is blocking it?
- what happens next?

## Hierarchy-specific update behavior
- child status changes should update parent rollups
- parent status should reflect meaningful child blockers when required
- parent completion should usually require all mandatory subtasks to be completed or explicitly waived

---

# 11. Agent Compliance Rules

## Agents must not use markdown as the authoritative task queue
Allowed:
- notes
- drafts
- research
- supporting specs

Not allowed:
- a live task exists only inside agent notes
- progress is tracked only in markdown
- task completion is inferred from a doc instead of explicitly updated in Cockpit

## Agent workflow contract
Any agent execution loop should:
1. receive or resolve a Cockpit task id
2. pull task context from Cockpit
3. execute work in its native environment
4. push status changes back to Cockpit
5. attach artifact/result links where relevant
6. emit lifecycle events into `activity_log`

## Hierarchy contract for agents
When assigned to subtasks, agents should:
- work at the child level where possible
- avoid silently creating shadow task lists elsewhere
- explicitly link outputs to the child or parent task as appropriate
- surface blockers so the parent can be escalated properly

If an agent starts work without a Cockpit task id:
- either create a draft task immediately,
- or mark the work as non-compliant and route it into an exception queue.

---

# 12. Review and Reconciliation Loop

Even a good intake system will drift without cleanup.

## Daily / periodic reconciliation process
Build a review job that checks for:
- recent source messages that likely created work but have no Cockpit record
- tasks with no assignee
- tasks with no activity for too long
- agent-run work with no task id linkage
- parent tasks with stale or inconsistent child rollups
- parent tasks marked done while active subtasks remain
- tasks completed outside Cockpit and not reflected in status

## Output queues
Create review queues such as:
- **Unregistered Work**
- **Unassigned Tasks**
- **Stale In Progress**
- **Awaiting Review**
- **Blocked Too Long**
- **Hierarchy Mismatch**

This is what prevents work from leaking back into chat threads and private notes.

---

# 13. Vector + Retrieval Alignment

Task ownership, hierarchy, and log retrieval should align with the canonical operational event spine.

## Principle
Do not maintain one world for operational logs and another separate world for semantic retrieval.

## Recommended direction
- `activity_log` remains canonical
- embedding/indexing jobs read from canonical event outputs
- task lifecycle events are embedding candidates
- parent and child lifecycle summaries can both be indexed where useful

## Recommended storage direction
Prefer **pgvector in Neon** unless there is a strong scaling or product reason to split vector storage into a separate system.

This keeps:
- logs
- task state
- retrieval context
- and reporting lineage

inside one coherent architecture.

---

# 14. UI / Product Requirements

Cockpit should visibly support both strategic review and execution detail.

## Required strategic capabilities
- task list filtered by operator
- parent-first default views
- expandable/collapsible child subtasks
- rollup indicators on parent tasks
- blocked reason display
- artifact links
- review queue views
- stale task views

## Required execution capabilities
- task detail view with ordered subtasks
- subtask owner visibility
- dependency / sequence visibility
- parent-child status relationships
- next-action surfacing
- child-level artifact and completion tracking

## Recommended dashboard views
- **My Tasks**
- **Charlie's Queue**
- **Agent Queue**
- **Awaiting Oli Review**
- **Blocked Work**
- **Unregistered Work**
- **Needs Assignment**
- **Parent Tasks**
- **Execution Detail**

---

# 15. Implementation Waves

## Wave A — Policy + schema hardening
**Goal:** establish the rules and schema needed for ownership and hierarchy discipline.

### Deliverables
- finalize hierarchy rules
- add `parent_task_id`
- add ownership fields
- add source tracking fields
- add lifecycle timestamps
- add artifact linkage fields
- add operator model for humans + agents

### Success criteria
- every new task can be assigned cleanly
- task record can store source, owner, hierarchy, status, and artifact linkage

---

## Wave B — Priority-safe hierarchy behavior
**Goal:** preserve the current prioritisation workflow while adding subtask execution structure.

### Deliverables
- parent-first priority model
- child rollup logic
- parent escalation from child blockers / overdue states
- review-safe hierarchy rules

### Success criteria
- strategic boards stay readable
- subtasks improve execution without flooding top-level queues

---

## Wave C — Intake to task registration
**Goal:** make real work from Slack/manual/email/forms land in Cockpit by default.

### Deliverables
- Slack/manual intake route
- task classification pipeline
- parent/subtask classification logic
- draft-task creation for ambiguous items
- source message linkage
- canonical activity log event on task creation/update

### Success criteria
- actionable requests from supported channels create or update Cockpit records
- source channel/message is traceable from the task

---

## Wave D — Agent execution contract
**Goal:** make agents work from Cockpit tasks instead of side lists.

### Deliverables
- task fetch endpoint for agents
- task update endpoint for agents
- task-id-required execution protocol
- operator-aware reporting
- exception path for non-compliant work

### Success criteria
- named agents can be assigned work in Cockpit
- agents can move status through the lifecycle
- agent progress is visible in Cockpit without reading markdown

---

## Wave E — Reconciliation + governance
**Goal:** prevent drift and enforce compliance.

### Deliverables
- unregistered-work detection
- stale-task detection
- no-assignee detection
- blocked-too-long detection
- hierarchy mismatch detection
- review queue UI

### Success criteria
- operational leaks are visible quickly
- hidden work is surfaced
- stale or orphaned tasks become hard to ignore

---

## Wave F — Scheduling and reassignment loop
**Goal:** turn task tracking into execution discipline.

### Deliverables
- calendar/time-blocking linkage
- daily review workflow
- incomplete-task reslotting
- supervisor escalation rules

### Success criteria
- tasks move from queue into time
- unfinished work gets rescheduled or reassigned explicitly

---

# 16. Recommended Immediate Build Order

The highest-leverage sequence is:

1. **Task schema hardening**
2. **Operator model (human + agent assignees)**
3. **Parent/subtask hierarchy fields and rollup logic**
4. **Task lifecycle timeline writing to `activity_log`**
5. **Slack/manual task intake**
6. **Agent task update API / protocol**
7. **Review queues for stale/unassigned/unregistered/hierarchy-mismatch work**
8. **Calendar-native execution layer**

This sequence gives the fastest path to real behavior change without breaking the existing priority workflow.

---

# 17. Definition of Done

This plan is considered successfully implemented when:

- actionable work no longer lives only in chat or markdown
- every executable task has a visible owner in Cockpit
- parent tasks and subtasks are represented clearly
- parent tasks remain the review and prioritisation objects
- subtasks improve execution without flooding strategic views
- agents can be assigned work as first-class operators
- progress updates happen in Cockpit during execution
- task lifecycle events appear in the canonical operational log
- stale, orphaned, or unregistered work is visible in review queues
- incomplete work is reviewed and deliberately rescheduled or reassigned

At that point, Cockpit stops being a passive dashboard and becomes the actual operational control layer.

---

# 18. Practical Summary

The core move is still not complicated:

> **Markdown is for thinking. Cockpit is for doing.**

And with hierarchy added, the rule becomes:

> **Prioritise parent tasks, execute through subtasks, and make child state visible through parent rollups rather than top-level queue spam.**

If work matters, it gets a Cockpit record.
If someone owns it, that ownership is visible.
If progress happens, Cockpit gets updated.
If the task is complex, it can be broken into subtasks.
If the task finishes, the artifact is linked.
If it stalls, the system shows that clearly.

That is the operating discipline required for Cockpit to become real.
