# OPS v5 — Rollout Plan (Charlie, Devon, Claude Code)

**Date:** 2026-03-27  
**Status:** Active rollout roadmap  
**Purpose:** Define the practical step-by-step rollout for getting OPS v5 — Cockpit from current architecture into a real working operating system while Byron Film, KORUS, and OM continue running day to day.

---

# 1. Mission

The goal is not to pause the business and go build software in a cave.
The goal is to build OPS v5 **inside the business**, in a way that compounds value every week.

That means:
- keep the business running,
- improve real workflows incrementally,
- avoid massive rewrites,
- and use AI agents as execution force multipliers.

## The team shape
- **Oli** = principal, final judgment, strategic direction, approval
- **Charlie** = architect, orchestrator, continuity, review, routing logic, reporting
- **Devon** = implementation-oriented dev agent/persona for technical build execution
- **Claude Code** = coding engine / hands-on implementation environment in VS Code on the Mac mini

---

# 2. Core Constraint

The system is being built while:
- serving Byron Film,
- developing KORUS operations,
- and supporting OM-level work.

So the correct operating model is not “big bang build.”
It is:

> **nightly compound-interest development**

Small, valuable, compounding improvements win.

---

# 3. Build Philosophy

## 1. Build the spine first
Before sophisticated orchestration, the intake/routing/logging/measurement system must work.

## 2. Prefer source-of-truth clarity over feature sprawl
Each new feature should answer:
- what is the source of truth?
- what gets logged?
- where does the artifact live?
- who is responsible?
- how is it measured?

## 3. Use native best-fit systems
Cockpit should orchestrate, not try to replace every specialist backend.

## 4. Keep humans in the loop where judgment matters
No autonomous empire-building. Human steering stays central.

## 5. Ship by checkpoints
Every checkpoint should be:
- testable,
- reviewable,
- useful,
- reversible.

---

# 4. Where We Are Now

## Completed
### Logging / reporting sprint
- canonical operational event spine established
- historical data backfilled
- Logs repointed
- Productivity repointed
- AI Metrics repointed
- rollout merged and deployed
- OPS v5 architecture docs now organized in `docs/architecture/v5/`

## Newly locked architectural direction
- channels/forms = intake
- Cockpit = operational truth
- specialist systems = execution/storage
- log the outcome, not the chat
- calendar-native execution is preferred over passive task lists
- comms belong in Phase A

---

# 5. Rollout Overview

The rollout should happen in **five major build waves**.

## Wave 1 — Stabilize the Cockpit Spine
**Status:** mostly underway / largely complete

### Goal
Make the Cockpit trustworthy as the operational record and metrics spine.

### Included
- unified logging
- metrics alignment
- semantic search/log polish
- API cleanup
- legacy route/table freeze planning

### Done / near-done
Most of this is now completed or in final cleanup territory.

---

## Wave 2 — Intake & Artifact Routing v1
**Next major build**

### Goal
Turn Slack/Teams/messages/forms into a structured intake layer that creates the right operational objects in Cockpit.

### Must cover
- task intake
- project intake
- docs/artifact requests
- event creation requests
- comms capture/routing

### Required outputs
For each intake item:
- classify request type
- assign workspace/entity
- assign destination system
- register in Cockpit
- log outcome in canonical operational log
- link back to source channel/message where useful

### Why this is next
This is the bridge between conversation and measurable operational output.

---

## Wave 3 — Execution & Scheduling Loop
### Goal
Move beyond task lists into actual execution behavior.

### Must cover
- task registration in Cockpit
- time-blocking into calendars
- end-of-day review loop
- incomplete task reassignment to next realistic slot
- workspace-aware scheduling logic

### Why this matters
For Oli, tasks on lists are low-trust.
Tasks scheduled into time are high-trust.

This wave turns Cockpit from registry into execution-support system.

---

## Wave 4 — Comms + CRM + Contact Spine
### Goal
Make communication and contact workflows measurable and routable.

### Must cover
- leads/contacts intake
- outbound comms actions
- message/email linkage to workspace/contact/project
- CRM destination decisions
- comms logging against canonical operational log
- vector/context linkage for retrieval later

### Why this matters
Comms are a first-class business function, not an afterthought.

---

## Wave 5 — Orchestration + Specialist Agents
### Goal
Layer richer internal agent roles on top of a stable operational system.

### Possible shape
- PM-style agents monitoring multiple projects
- specialist agents for growth / sales / finance / ops / research / creative
- Charlie orchestrating and reporting
- Oli reviewing/steering/escalating

### Important rule
Do not build theatrical agent bureaucracy before Waves 1–4 are stable.

---

# 6. Immediate Next Build: Wave 2

## Name
**OPS v5 — Intake & Artifact Routing v1**

## Objective
Build the first real version of the intake-routing loop so work requested in channels becomes measurable delivery in Cockpit.

## Inputs to support first
- Slack
- email
- forms
- optionally Teams once native flow is ready

## Request types to classify first
- task
- project
- document/artifact
- event
- communication action

## Delivery destinations to support first
- Cockpit task/project/event records
- Google Calendar / Outlook event creation
- Google Drive / OneDrive / iCloud storage targets
- Obsidian for research/report outputs

## MVP rule
If a message in Slack produces a real deliverable, the deliverable should:
- be registered in Cockpit
- be linked to the right workspace/object
- be stored in the right execution/storage system
- count toward productivity and operational metrics

---

# 7. Recommended Working Rhythm

## Daily rhythm
### Daytime
- run the business
- collect friction points
- identify recurring manual work
- decide what should become productized into Cockpit next

### Evening / overnight
- small implementation checkpoints
- Claude Code builds
- Charlie reviews/orchestrates
- Devon handles tactical technical execution patterns where useful
- Oli reviews only what matters

## Weekly rhythm
- one primary build theme per week
- one measurable operational gain per week
- architecture doc updated when thinking changes materially

This prevents chaos and keeps compounding visible.

---

# 8. Role Definition in Practice

## Oli
- decides priorities
- approves structural changes
- evaluates whether the system is actually helping
- provides business judgment and exceptions

## Charlie
- maintains architecture continuity
- translates business needs into build checkpoints
- decides routing logic and operational structure
- reviews Claude Code output
- keeps the system honest and cohesive
- proactively identifies next useful build slices

## Devon
- technical implementation persona for building/reviewing dev-heavy pieces
- can be used for department/system build execution contexts
- especially helpful where engineering structure matters more than broad orchestration

## Claude Code
- executes coding work in VS Code/terminal
- best used in tightly scoped checkpoints
- should be treated as implementation engine, not product manager

---

# 9. Dependency Multipliers

## Highest-leverage multiplier
### Charlie ↔ Claude Code co-pilot bridge
This is one of the most important enablers because the current copy/paste relay loop is wasteful.

### Why it matters
Without the bridge:
- too much human relay work
- too much context loss
- slower nightly iteration

With the bridge:
- Charlie can steer implementation directly
- faster review loops
- better overnight compounding

## Important note
This should be built **after** the current rollout/sprint is fully stabilized, not in the middle of it.

---

## Second highest multiplier
### KORUS programmatic access
KORUS will underperform relative to Byron Film/OM until access improves.

The more programmatic access we have to:
- email
- calendar
- contacts
- files
- CRM-ish systems
- tasks

…the more accurately Cockpit can measure and improve KORUS operations.

---

# 10. Timeline Estimate

## Useful v1
**4–8 weeks**

### Includes
- stable operational spine
- intake/routing v1
- basic artifact registration
- first real channel-to-Cockpit loop
- early execution scheduling support

## Strong operational system
**2–3 months**

### Includes
- smoother routing
- stronger comms/CRM linkage
- better execution loops
- more reliable cross-workspace reporting

## Mature Cockpit
**3–6 months**

### Includes
- deeper orchestration
- reusable patterns/templates
- stronger business launch capability
- more refined internal agent roles

## Important constraint
These estimates assume work continues while the businesses also run.
This is not full-time greenfield development.

---

# 11. What Success Looks Like

## In the near term
- requests in channels produce measurable structured outcomes
- Cockpit reflects real delivered work
- productivity metrics become more trustworthy
- fewer things get lost in chat

## In the medium term
- work is routed to the right systems automatically or semi-automatically
- tasks are scheduled, not just listed
- comms and contacts become operationally measurable
- project and area ownership becomes clearer

## In the longer term
- Cockpit becomes the real steering layer for an AI-native business
- specialized tools plug into it
- new ventures can be launched from repeatable operational patterns

---

# 12. Immediate Next Steps

## Step 1
Finish confirming the unified logging sprint is live and behaving correctly.

## Step 2
Start the **Intake & Artifact Routing v1** build.

## Step 3
Define the first intake classification matrix:
- message type
- object type
- destination system
- required log event
- required storage destination

## Step 4
Build the first end-to-end flows:
- Slack → task/project in Cockpit
- Slack → event in calendar + Cockpit
- Slack → document request → stored artifact + Cockpit log
- Slack/email/forms → comms/contact handling path

## Step 5
Then design the Charlie ↔ Claude Code co-pilot bridge as the next multiplier.

---

# 13. Final Definition

OPS v5 is not just software.
It is a gradually built operational system where:
- intake happens in natural channels,
- work is routed into the correct business structures,
- outputs become measurable,
- execution is scheduled realistically,
- and the human stays at the helm.

---

# 14. One-Line Summary

> **Build the operational spine first, then the intake-routing loop, then the execution loop, then comms/CRM, then richer orchestration — all while the business keeps moving.**
