# OPS v5 — Task Hierarchy Decision Note

**Date:** 2026-03-30  
**Status:** Locked design decision  
**Purpose:** Record the agreed task hierarchy model for the Cockpit task-system rebuild so architecture, UI, schema, and implementation docs all work from the same rule set.

---

# 1. Decision Summary

Cockpit will support **generic task nesting in schema** using parent-child relationships, but the **product rule and UI rule for v1 is a practical two-layer model**:

- **Parent task** = prioritisation + review object
- **Subtask** = execution object

This gives us future flexibility without turning the current task experience into an over-nested mess.

---

# 2. Core Rules

## Rule 1 — Parent task is the strategic object
A parent task is the thing that should appear in:
- top-level task review
- prioritisation workflows
- strategic steering views
- scheduling decisions
- summary dashboards

A parent task carries the primary planning signal:
- importance
- urgency
- impact
- overall effort
- due date
- project / area context
- owner
- review state
- priority score / rank

## Rule 2 — Subtask is the execution object
A subtask exists to break a parent task into actionable work for humans and agents.

A subtask primarily carries:
- `parent_task_id`
- title
- assignee
- status
- local effort estimate
- optional due date
- sequence / dependency information
- optional blocking flag
- notes / artifacts / completion summary

Subtasks improve execution clarity. They do not become top-level strategic objects by default.

## Rule 3 — Prioritise parents, not every child
The current Cockpit prioritisation model already evaluates work using:
- importance
- urgency
- effort
- impact
- project tier / project context
- blocking / critical-path logic

That model should remain centered on **parent tasks**.

Subtasks should **inherit parent priority context** by default rather than each becoming separately scored top-level tasks.

## Rule 4 — Subtasks can influence parent visibility
Subtasks should not compete with parents for top-level attention, but their state should influence the parent when relevant.

Examples:
- a blocking subtask can escalate parent visibility
- an overdue critical subtask can mark the parent as at-risk
- an unassigned next-action subtask can surface the parent as needing execution ownership
- all subtasks complete can move the parent toward review/done

So the child affects the parent signal rather than duplicating it.

## Rule 5 — UI should be parent-first in review, child-first in execution
Cockpit should support toggle-based hierarchy views.

### In review / strategic views
Default view should be **parent-first**:
- show parent tasks
- show priority / due date / owner / status
- show rolled-up child progress and blockers
- allow expand/collapse toggle to reveal subtasks

### In execution views
Detail views can be **child-first** within the selected parent:
- ordered subtasks
- assignees
- dependencies
- blockers
- artifact links
- next-action signals

---

# 3. Generic Nesting vs Product Simplicity

## Schema decision
Use a generic relationship model such as:
- `parent_task_id`

This keeps future options open.

## Product decision for v1
Even if schema supports arbitrary nesting, **v1 product behavior should strongly bias to two levels**:
- parent
- child

This avoids complexity blowouts in:
- prioritisation
- scheduling
- UI legibility
- review routines
- reporting

If deeper nesting is ever supported later, it should be a deliberate product decision, not an accidental side effect of the schema.

---

# 4. UI Requirements from This Decision

## Toggle behavior
The task UI should let the user:
- see parent tasks by default
- expand/collapse child subtasks inline
- view parent progress rollups without opening everything
- open a task detail view where subtask execution is fully visible

## Rollup indicators
Parent rows/cards should be able to show:
- `3/7 subtasks complete`
- `1 blocked`
- `awaiting review`
- `next actionable child`
- `overdue child`

## Noise control
Subtasks should not flood top-level boards by default.

Main strategic boards should remain readable by surfacing:
- parent tasks
- rollup health
- priority state
- blocker state

---

# 5. Priority Model Implication

The agreed rule is:

> **Prioritise parent tasks, execute through subtasks, and let subtask state influence parent visibility rather than compete with it.**

This preserves the current priority engine logic while improving execution structure.

It also prevents:
- board spam
- duplicate urgency
- priority inflation
- strategic views being overwhelmed by implementation crumbs

---

# 6. Migration / Build Implication

All task-system rebuild specs should now assume:
- hierarchy-aware task schema
- parent/subtask linkage
- parent-first review model
- subtask execution model
- expandable/collapsible hierarchy UI
- rollup logic from child state to parent visibility

This decision note should be treated as the anchor for the task-system rebuild docs.

---

# 7. One-Line Summary

> **Cockpit will support generic task nesting in schema, but v1 will operate as a parent-task / subtask system where parents hold strategic priority and subtasks drive execution.**
