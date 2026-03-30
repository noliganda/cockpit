# OPS v5 — Intake, Routing, and Execution Model

**Date:** 2026-03-30  
**Status:** Active architecture direction  
**Purpose:** Define the generic intake, routing, storage, execution, and measurement model for OPS v5 — Cockpit.

---

# 1. Why this model exists

OPS v5 — Cockpit is not meant to be just a dashboard and not meant to be just another place where tasks get dumped into a list and ignored.

The real goal is to create a system where:
- requests can come from natural communication channels,
- meaningful work is routed into the right operational structure,
- artifacts are delivered to the right system,
- work becomes measurable,
- execution becomes more legible,
- and the human can steer based on what actually got produced.

The key principle is:

> **You can’t improve what you can’t measure.**

So this model defines how requests become structured operational objects and measurable outputs.

---

# 2. Core Principle

## Slack and channels are not the database
Channels are the **intake and coordination layer**.
They are where requests, discussion, approvals, and context often begin.

But the system of truth should not remain inside chat threads.

## Cockpit is the operational record
Cockpit should become the place where work becomes:
- legible,
- routed,
- linked,
- measurable.

## Specialist systems still do specialist jobs
Cockpit should not physically store every file and every object in the universe.
It should know:
- what the thing is,
- where it lives,
- who asked for it,
- what project/area/contact/event it belongs to,
- whether it is a parent task or a child execution item where relevant,
- who is responsible,
- and what happened.

So the generic rule is:

> **Channels for intake. Cockpit for operational truth. Specialist systems for execution and storage.**

---

# 3. Layer Model

## Layer 1 — Intake
The intake layer is where requests enter the system.

### Internal/private intake
- Slack
- Telegram
- iMessage
- WhatsApp
- Email

### Public-facing intake
- Forms (e.g. website forms like Byron Film inquiries)

### What intake is for
Intake is where:
- ideas are proposed,
- tasks are requested,
- projects are discussed,
- events are requested,
- documents are asked for,
- communication actions are triggered,
- research/report requests are initiated.

At this layer, the request is still unstructured.

---

## Layer 2 — Interpretation and Routing
This is where the system determines what the request actually is and where it belongs.

### The routing problem
For each request, the system should determine:
- which workspace/entity it belongs to (Byron Film, KORUS, OM, etc.)
- what kind of thing it is
  - task
  - project
  - area item
  - event
  - contact/CRM item
  - document/artifact
  - communication action
  - research/report
- whether the work should become a **parent task** or a **subtask** of existing work
- who is responsible
- which backend/storage system it should live in
- whether it should become measurable operational output

### Responsibility model
For now, the responsible operators are primarily:
- **Oli**
- **Charlie**

Other agents may be used internally, but not as the primary public-facing operators.

### Why this matters
This routing layer is what stops the system from becoming a pile of disconnected chats and files.
It is also what stops complex work from becoming either:
- one vague flat task with no execution structure,
- or dozens of disconnected flat tasks with no strategic parent.

---

## Layer 3 — Cockpit Registration
This is the critical layer and should be continuously developed as Cockpit evolves.

### What Cockpit must register
When a request becomes a meaningful operational object, Cockpit should record:
- source request/channel
- workspace/entity
- object type
- project/area/task/event/contact linkage
- whether the task is a parent or a child
- parent-child linkage where relevant
- responsible operator
- current status
- output/artifact linkage
- operational log event
- measurement fields where relevant

### This is the real source of truth
Cockpit does not need to be the physical home of every artifact.
But it should be the place where the artifact becomes operationally visible and measurable.

### Why this is core to v5
Cockpit is where everything becomes:
- legible,
- routed,
- linked,
- measurable.

That is one of the core defining ideas of OPS v5.

---

## Layer 4 — Execution and Storage
Cockpit should route work to the system that is best suited to execute or store it.

### Tasks and projects
- captured/registered in Cockpit
- may sync into Google Workspace / Microsoft To Do style systems where useful
- but Cockpit should remain the operational record

### Parent task / subtask implication
When work is complex enough to need hierarchy:
- the **parent task** should hold the main strategic context
- the **subtasks** should hold the execution breakdown
- subtasks should improve execution clarity without overwhelming the strategic boards

### Calendar events
- requested in channels
- registered in Cockpit
- created in Google Calendar (OM / BF) or Outlook / Microsoft systems (KORUS)

### Documents and artifacts
- requested through channels
- registered in Cockpit
- stored in the right backend:
  - Google Drive (Byron Film)
  - iCloud (OM)
  - OneDrive (KORUS)

### Research and reports
- requested in channels
- registered in Cockpit
- stored in Obsidian / knowledge system

### Contacts / CRM / communication records
- requested or triggered in channels
- registered in Cockpit
- live in CRM / contacts / inbox / messaging system as appropriate

### Finance / contracts / ops systems
- stored/executed in their native systems
  - Xero
  - Airwallex
  - Stripe
  - eSignatures
  - etc.
- but linked and measurable through Cockpit

### Important constraint
Cockpit should be the **registry and orchestration layer**, not necessarily the deep storage system for every artifact.

---

## Layer 5 — Review, Prioritisation, Scheduling, and Reassignment
This is where execution becomes real.

### Key behavioral truth
For Oli, a task sitting on a list is much less likely to be completed than a task placed into time on a calendar.

### Another key truth
Cockpit already has a prioritisation workflow that takes into account:
- importance
- urgency
- effort
- impact
- project context
- blocking / critical-path logic

That strategic signal should remain centered on **parent tasks**, not every child execution item.

### Operational implication
The system should evolve toward:
- task capture in Cockpit
- parent-first review
- child execution detail when needed
- scheduling into calendar/time blocks
- end-of-day review
- incomplete tasks being reslotted to the next realistic slot

### Desired loop
- request enters the system
- task/project/event is registered in Cockpit
- if needed, task is broken into subtasks
- strategic priority stays with the parent task
- execution is scheduled
- day ends
- incomplete work is reviewed and reassigned

This is stronger than either:
- dumping flat tasks into a backlog forever,
- or flooding the board with execution crumbs pretending to be strategic priorities.

---

# 4. Communications as a First-Class Capability

The intake model must explicitly include **communications**.

That means:
- outbound emails
- outbound WhatsApp / iMessage / Telegram / Slack actions
- contact creation
- CRM-related communication actions
- communication-triggered deliverables

## Why comms matter
Communications are not peripheral.
They are central to:
- business development,
- project execution,
- client management,
- relationship continuity,
- measurable output.

So communications should be treated as an important operational class, not an afterthought.

## Design implication
Communication artifacts and actions should be:
- linked to workspace/entity
- linked to project/area/contact where relevant
- measurable in the canonical operational log
- retrievable in context later

This also raises the importance of CRM architecture and comms logging choices.

---

# 5. Workspace / Department / Area Thinking

Cockpit should make it possible to route and measure work across:
- Byron Film
- KORUS
- OM / personal / shared operations
- future ventures

And at a more operational level, areas/departments can become responsibility containers for:
- growth
- operations
- finance
- sales
- marketing
- R&D
- recruitment
- project delivery

Specialized agents can later support these areas, but that should happen on top of a stable intake-routing-execution spine rather than before it.

---

# 6. Role of Agents

## Current state
For now, the core human/AI operating pair is:
- Oli
- Charlie

Additional agents may be used internally for specialized help.

## Later state
The system may evolve toward:
- project-monitoring / PM-style agents
- specialist departmental agents
- orchestration/reporting by Charlie
- escalation/reporting back to Oli

But this should happen **after** the intake-routing-execution spine is stable.

The architecture should avoid creating a theatrical bureaucracy of named agents before the actual operational model is reliable.

---

# 7. Notion vs Obsidian vs Native Systems

## Notion
Notion may still be useful as an **operational fallback** if Cockpit fails.
It is not necessarily the ideal primary operational system if it becomes another private dependency with duplicate structure.

## Obsidian
Obsidian is the stronger **knowledge/research/intelligence fallback** and long-term documentation layer.

## Preferred model
- Cockpit = primary operational orchestration + truth layer
- Native systems = actual execution/storage backends
- Notion = operational fallback if needed
- Obsidian = durable knowledge/research layer

So Notion and Obsidian are not interchangeable. They solve different fallback problems.

---

# 8. Generic Rule for Logged Work

The system should not try to log every message.
That would create noise.

Instead, it should log:
- meaningful operational objects
- completed actions
- delivered artifacts
- measurable events
- meaningful parent/child lifecycle changes where they affect execution visibility

## Better rule
> **Log the outcome, not the chat.**

That means a Slack request itself does not need to be the operational artifact.
What matters is that the resulting:
- task
- project
- document
- event
- contact
- communication action
- research output

gets registered in Cockpit and counted properly.

This is better for both operations and reporting.

---

# 9. Strategic Importance for KORUS

A major strategic constraint remains:

> **KORUS needs more programmatic access.**

Without this, Byron Film and OM will continue to outperform KORUS in measurable AI leverage simply because the systems are easier to access and automate.

This is not just a technical detail.
It directly affects:
- productivity measurements,
- AI leverage,
- reporting quality,
- and the business case for deeper systems integration.

---

# 10. Phased Build Direction

## Phase A
Build intake/routing for:
- tasks
- projects
- docs/artifacts
- events
- communications

## Phase B
Add hierarchy-aware task handling:
- parent/subtask registration
- parent-first review logic
- child execution structure
- rollup visibility

## Phase C
Route outputs into the right execution/storage systems:
- Drive / OneDrive / iCloud
- calendars
- CRM / contacts
- knowledge systems

## Phase D
Strengthen measurement and review loops:
- logging
- output linkage
- workspace metrics
- time-blocking / rescheduling
- hierarchy-aware review routines

## Phase E
Add richer orchestration and specialist agents

## Phase F
Harden fallback and resilience

This keeps the model achievable by stages rather than trying to build the final empire in one move.

---

# 11. Final Definition

OPS v5 — Cockpit should become:

> **the place where requests from channels and forms become structured operational objects, get routed to the right execution/storage systems, and are made legible, linked, measurable, and execution-ready for human steering.**

That is the most accurate generic definition of the model.

---

# 12. One-Line Summary

> **Channels are the intake. Cockpit is the operational truth. Specialist systems execute and store. The value of the system comes from routing real work into measurable outcomes — with parent tasks holding strategy and subtasks holding execution where needed.**
