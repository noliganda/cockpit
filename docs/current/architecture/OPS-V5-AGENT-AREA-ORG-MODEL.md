# OPS v5 — Agent / Area / Execution Org Model

**Date:** 2026-03-30  
**Status:** Working spec note  
**Purpose:** Lock the conceptual model before building agent routing, execution, and orchestration layers on top of Cockpit.

---

# 1. Core model

## Cockpit is the system of record
Not where work happens. Where work is tracked, routed, and measured.

- Areas = company departments
- Projects = finite deliverables inside areas
- Tasks/Subtasks = executable units
- Events, messages, documents = logged artifacts
- Agents = first-class operators with area/project ownership

---

# 2. Org chart model

```
Area (department)
  → managed by an Area Agent
  Project (belongs to area)
    → owned by area agent
    Task (belongs to project)
      → executed by area agent or spawned sub-agent
      Subtask
        → execution steps
```

## Area → Agent mapping (to be confirmed)
- Devon — engineering / product
- Finn — growth / marketing
- Hunter — research / intelligence
- Marcus — finance / ops
- Scout — recruitment / sourcing

These agents are **area managers**, not just task executors.

---

# 3. What the workflow looks like

1. **Intake** — post in Slack / DM bot / slash command
2. **Classification** — AI routing (LLM + keyword fallback) determines type, workspace, priority
3. **Cockpit registration** — object created (task/project/event) with source metadata
4. **Routing** — task assigned to the right area agent based on workspace + area
5. **Execution** — agent executes, hacks until done, calls tools/sub-agents as needed
6. **Status updates** — agent pushes progress back to Cockpit
7. **Review** — Oli reviews in Cockpit or via Slack confirmation

---

# 4. What today's build covers

| Step | Status |
|------|--------|
| 1. Intake (Slack → Cockpit) | ✅ Done (keyword + partial Slack) |
| 2. Classification | ⚠️ Partial (keyword only, no LLM yet) |
| 3. Cockpit registration | ✅ Done (tasks, hierarchy, source metadata) |
| 4. Routing to area agent | ❌ Not yet (agent/area map not in Cockpit) |
| 5. Agent execution loop | ❌ Not yet |
| 6. Status updates from agents | ⚠️ Partial (schema exists, no live agent writing yet) |
| 7. Review | ✅ Intake review queue exists |

---

# 5. What's missing

## 5.1 AI classification (LLM routing)
Replace keyword classifier with LLM call.
Input: raw message + workspace hints
Output: structured JSON (type, workspace, priority, assignee, confidence)
Model: haiku/flash for cost, sonnet fallback for ambiguity

## 5.2 Area → agent mapping in Cockpit
Need operators table rows for Devon/Finn/Hunter/Marcus/Scout with area_ids.
Then routing logic: task in area X → assign to area's agent.

## 5.3 Agent execution loop (Ralph loop)
The loop that makes agents keep executing until done:
1. Agent receives task from Cockpit
2. Executes (calls tools, skills, sub-agents)
3. Hits blocker or completes
4. Updates Cockpit
5. If incomplete → retry or escalate

Currently Charlie + Claude Code is a manual version of this.
A Ralph loop makes it automatic.

## 5.4 IDE Bridge
Lets agents (especially Devon) execute coding tasks in a real IDE session without Oli being the relay.
- Session registry
- Steering channel
- Checkpoint protocol
- Context handoff

## 5.5 Skills pool
Agents pull capabilities from a shared library rather than having everything hardcoded.
Skills could include:
- email outreach
- landing page generation
- image/video generation
- trend research
- lead enrichment
- document drafting
- social post creation

Skills can be: OpenClaw skills, MCPs, custom scripts, API wrappers.

## 5.6 Agent repo / sub-agent pool
When a task needs spawning, agent picks from a pool of specialist sub-agents.
Each sub-agent has:
- capability tag
- skill set
- cost profile
- preferred execution context

---

# 6. Agents and skills for parallel business execution

## Byron Film
| Goal | Agent | Skills needed |
|------|-------|---------------|
| Email outreach | Finn | email composition, Apollo enrichment, Gmail |
| Landing page dev | Devon | IDE Bridge, Next.js/Webflow |
| Image/video creation | Finn/Scout | image gen, ElevenLabs, frame.io |
| Trend research | Hunter | web search, Obsidian write, YouTube API |
| Lead gen | Finn | Apollo, LinkedIn scrape |

## KORUS
| Goal | Agent | Skills needed |
|------|-------|---------------|
| Recruitment sourcing | Scout | Apollo, LinkedIn |
| Client outreach | Finn | email, CRM |
| Ops reporting | Marcus | Xero, Sheets, Cockpit metrics |

## Shared
| Goal | Agent | Skills needed |
|------|-------|---------------|
| Content strategy | Hunter | research, draft, schedule |
| Contract/invoice | Marcus | Xero, Airwallex, eSignatures |
| Cron jobs | Charlie | heartbeat, monitoring |

---

# 7. Priority build order from here

1. **AI classification** — most immediate unlock, intake becomes genuinely useful
2. **Area → agent routing** — connects intake to actual operator ownership
3. **Skills formalisation** — inventory what we have, what we need, map to agents
4. **Agent execution loop** — Ralph loop / persistent task execution
5. **IDE Bridge** — specifically for Devon to run coding tasks without Oli relay
6. **Sub-agent pool** — for tasks that need specialisation at execution time

---

# 8. One-line summary

> Cockpit is the org chart, the ops record, and the measurement layer. Agents are the execution layer. The missing piece is the routing and execution loop that connects them.
