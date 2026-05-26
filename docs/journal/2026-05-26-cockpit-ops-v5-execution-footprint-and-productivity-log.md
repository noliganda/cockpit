# Daily Log & Handoff — Cockpit OPS v5 Execution Footprint + Productivity Logging

Date: 2026-05-26
Last updated: 2026-05-26 20:36 AEST
Primary repo: `/Users/agentsmyth/workspaces/dev/cockpit`
Shared workspace: `/Users/agentsmyth/workspaces/_shared`
Journal location: `/Users/agentsmyth/workspaces/om/projects/cockpit`
Current Cockpit branch at handoff: `main`
Latest verified Cockpit commit: `02ad77d Support harness provenance in tasks and logs`

Location note: this file now lives in the OM Cockpit project journal because `/Users/agentsmyth/workspaces/om/projects/cockpit` is the ongoing record for Cockpit ideation, next steps, and completed work. The app code itself lives separately at `/Users/agentsmyth/workspaces/dev/cockpit` and is pushed to GitHub/Vercel from there.

## 1. Plain-English Summary

Today Cockpit was moved away from the old idea of fixed database "agent personas" and toward the new OPS v5 model:

- Cockpit is the source of truth for tasks, logs, and operational measurement.
- Local workspace folders are where work actually happens.
- Any AI harness/model can execute a task, as long as it leaves a trace in Cockpit.
- The trace now records:
  - which harness was used, e.g. Hermes, Claude Code, Codex, OpenCode;
  - which model was used, e.g. GPT-5.5, Gemini 3.5 Flash, Kimi K2.6;
  - which session ID produced the work, so another agent can resume/audit the exact run later.

The strategic shift is: provenance over personas. We no longer need to pretend that "Devon" or "Charlie" are permanent workers. The real worker is the local workspace context plus the active model/session.

## 2. Source-of-Truth Architecture Decisions

### Cockpit's role

Cockpit is the operational record:

- task registry;
- assignment surface;
- event spine via `activity_log`;
- provenance ledger for model/session/harness execution;
- productivity and reliability measurement layer.

Cockpit should not be the deep storage location for every artifact. Specialist systems still hold specialist outputs:

- repo files in Git workspaces;
- Google Drive / OneDrive / iCloud for documents and media;
- GitHub for code and PRs;
- email/calendar/CRM tools for external communications;
- Obsidian or wiki systems for knowledge.

Cockpit needs to know what happened, who/what did it, where the artifact lives, and whether the result is complete, blocked, failed, or awaiting review.

### Workspace role

Workspace folders are the effective "persona" and operating boundary:

- `~/workspaces/om` = personal brand + personal infrastructure;
- `~/workspaces/bf` = Byron Film;
- `~/workspaces/korus` = KORUS Australia;
- `~/workspaces/dev/cockpit` = Cockpit codebase;
- `~/workspaces/_shared` = shared protocols/templates/tools.

The workspace's `CLAUDE.md`, `CONTEXT.md`, and `SOUL.md` define the working rules. Any model that boots inside the folder should behave according to those files.

### Harness role

A harness is the execution shell, not a permanent employee:

- Hermes;
- Claude Code;
- Codex;
- OpenCode;
- OpenClaw;
- NanoClaw;
- Pie;
- future local or hosted execution runners.

Harnesses should be recorded as `assigneeType = "function"` when they execute tasks.

## 3. What Was Done Today in Cockpit

### 3.1 Database/task-schema pivot

Earlier session work migrated Cockpit's task schema and database to support ephemeral execution footprints.

Implemented/verified:

- `tasks.executing_model` added to the live Postgres database.
- `tasks.executing_session_id` added to the live Postgres database.
- TypeScript `Task` type extended with:
  - `executingModel`;
  - `executingSessionId`.
- Task APIs updated to accept and persist those fields.
- `assigneeType` validation expanded to include `function` alongside `human` and `agent`.
- Five strategic roadmap tasks seeded under the `personal` workspace:
  1. `strategy-cloud-local` — Completed;
  2. `notion-migration` — Backlog;
  3. `cockpit-reevaluation` — In Progress;
  4. `on-the-go-capture` — Backlog;
  5. `llm-failover-budget` — Backlog.

Known handoff file for that phase:

`/Users/agentsmyth/workspaces/om/projects/cockpit/2026-05-26-hermes-session-cockpit-pivot-handoff.md`

Relevant commit history from today:

- `7aa243f feat: pivot task system from static agent personas to ephemeral workspace functions`
- `5c0f47e feat: implement Task 3 - Task Dialog UI updates for harnesses, executing model, and session ID`
- `09e3d08 feat: filter out retired operators in dropdown and add update-operators script`
- `02ad77d Support harness provenance in tasks and logs`

### 3.2 Task Dialog UI updates

`components/task-dialog.tsx` was updated to visually support the new model.

Implemented:

- Harness/function options added for:
  - Hermes;
  - Claude Code;
  - Codex;
  - OpenCode;
  - OpenClaw;
  - NanoClaw;
  - Pie.
- Manual custom harness entry added so analysts are not limited to hardcoded dropdown options.
- `Executing Model` field added/kept editable.
- `Executing Session ID` field added/kept editable.
- Execution footprint panel added so task provenance is visible in the UI.
- Null-safe handling so older tasks without footprint data do not break the dialog.

Why this matters:

The operator can now look at a task and answer: "What harness/model/session actually did this?" without reading a separate transcript.

### 3.3 API provenance support

Task creation and update APIs were upgraded so harnesses can write their own provenance.

Updated files:

- `lib/auth.ts`
- `app/api/tasks/route.ts`
- `app/api/tasks/[id]/route.ts`

Implemented:

- Bearer-token auth support for harness/API requests.
- Harness identity can be passed via headers:
  - `x-harness-name`
  - `x-harness-model`
  - `x-harness-session-id`
- Harness requests can be represented as `actorType = "agent"` in logs/events while still using `assigneeType = "function"` on tasks.
- Task events now preserve harness/model/session metadata.
- Activity log entries now receive model/session provenance where possible.

Important security note:

Do not write real bearer tokens or secrets into handoff docs. Use env vars such as `$COCKPIT_API_TOKEN` or `$CRON_SECRET` in examples.

### 3.4 Operational logs UI updated

Updated files:

- `app/logs/page.tsx`
- `app/logs/logs-client.tsx`
- `app/api/logs/vector-search/route.ts`

Implemented:

- Log query includes:
  - `workflowRunId` — shown as Session ID;
  - `apiModel` — shown as Executing Model.
- Logs UI column naming changed from `Entity` to `Workspace` to reduce ambiguity.
- Log filtering aligned with `workspaceId` rather than legacy `entity` terminology.
- Expanded log rows now show model/session badges.
- Semantic/vector log search returns model/session fields too.

Why this matters:

The logs screen is becoming the productivity and observability cockpit: not just "what happened", but "which model/session produced it and in which workspace".

### 3.5 Charlie/static operator retirement

Charlie was retired from active operator surfaces.

Implemented:

- Removed Charlie from the live `operators` table.
- Removed Charlie from hardcoded `AGENTS` registry in `types/index.ts`.
- Filtered Charlie out of `/settings/agents` display as a UI safety net.
- Task assignee loading no longer exposes Charlie as an active choice.

Rationale:

Static named AI workers create confusion. OPS v5 should expose humans and harness/functions, not fictional permanent agents.

### 3.6 Verification

Verified:

- `npm run build` passed after implementation.
- Live DB no longer had Charlie as an operator row.
- Cockpit repo was clean after commit `02ad77d`.

## 4. Files Changed in Latest Cockpit Commit

Latest Cockpit commit: `02ad77d Support harness provenance in tasks and logs`

Files changed:

- `app/api/logs/vector-search/route.ts`
- `app/api/tasks/[id]/route.ts`
- `app/api/tasks/route.ts`
- `app/logs/logs-client.tsx`
- `app/logs/page.tsx`
- `app/settings/agents/agents-client.tsx`
- `components/task-dialog.tsx`
- `lib/auth.ts`
- `types/index.ts`

## 5. Productivity Metrics Cockpit Should Track Next

Current work gives Cockpit basic provenance. The next layer is productivity measurement.

Recommended event/log fields:

### Identity/provenance

- `workspaceId` — OM, BF, KORUS, personal, dev/cockpit, etc.
- `taskId` — the task being worked.
- `parentTaskId` — if this is a child/subtask.
- `harnessName` — Hermes, Claude Code, Codex, etc.
- `executingModel` / `apiModel` — GPT-5.5, Gemini 3.5 Flash, Kimi K2.6, etc.
- `executingSessionId` / `workflowRunId` — exact session/run ID.
- `actorType` — human, agent, system.
- `sourceType` — dashboard, API, webhook, chat, cron, manual import.

### Lifecycle timing

- `createdAt`
- `claimedAt`
- `startedAt`
- `lastHeartbeatAt`
- `blockedAt`
- `completedAt`
- `reviewedAt`
- `durationSeconds`
- `activeWorkSeconds` if measurable separately from wall-clock duration.

### Reliability/outcome

- `resultStatus`:
  - success;
  - partial;
  - blocked;
  - failed;
  - cancelled;
  - needs-review.
- `blockedReason`
- `failureReason`
- `retryCount`
- `handoffRequired` boolean
- `humanInterventionRequired` boolean
- `interventionType`:
  - clarification;
  - credentials;
  - approval;
  - missing context;
  - third-party outage;
  - model/tool failure;
  - business decision.

### Output/artifacts

- `artifactType`:
  - file;
  - PR;
  - commit;
  - doc;
  - email draft;
  - calendar event;
  - research report;
  - deployment;
  - database migration.
- `artifactUrl` or `artifactPath`
- `commitSha`
- `pullRequestUrl`
- `verificationCommand`
- `verificationResult`

### Cost/capacity

- `promptTokens`
- `completionTokens`
- `totalTokens`
- `apiCostUsd`
- `provider`
- `latencyMs`
- `toolCallCount`
- `filesChangedCount`
- `linesAdded`
- `linesRemoved`

### Quality/rework

- `reviewOutcome`:
  - accepted;
  - needs-changes;
  - rejected;
  - superseded.
- `reworkCount`
- `bugIntroduced` boolean
- `rollbackRequired` boolean
- `humanQualityScore` optional rating.

## 6. Reliability Workflow for Managing Tasks

The reliable operating rule should be:

No invisible work. If a harness did meaningful work, Cockpit should have a traceable event for it.

### Canonical flow

1. Task exists or is created in Cockpit.
2. Harness starts inside the relevant workspace folder.
3. Harness loads workspace instructions:
   - `CLAUDE.md`
   - `SOUL.md`
   - `CONTEXT.md`
   - relevant subfolder `CONTEXT.md` if applicable.
4. Harness loads the shared Cockpit wiring protocol:
   - `/Users/agentsmyth/workspaces/_shared/agent-protocols/cockpit-wiring.md`
5. Harness claims/checks into the task:
   - assignee type: `function`;
   - assignee name: harness name;
   - executing model: current model;
   - executing session ID: current run/session;
   - status: `In Progress`.
6. Harness executes work in the specialist workspace/system.
7. Harness writes progress events/checkpoints back to Cockpit.
8. Harness links artifacts back to Cockpit:
   - files changed;
   - commits;
   - PRs;
   - docs;
   - emails/drafts;
   - deployment URLs;
   - reports.
9. Harness verifies the result.
10. Harness checks out:
   - `Done` with summary and verification if successful;
   - `Blocked` with explicit blocker if blocked;
   - `Failed` or `Needs Review` if incomplete/unsafe.
11. Human can review Cockpit without needing to reconstruct what happened from chat.

### What I should do as Hermes

For any non-trivial task:

- use Cockpit as the canonical task ledger;
- use local todo/Kanban only as an execution scratchpad when helpful;
- never treat local todo/Kanban as the source of truth;
- push durable state back into Cockpit;
- leave a session/handoff file for anything complex or interrupted;
- commit code/docs when project instructions require it;
- mark completion only after verification.

### How other harnesses should behave

Every harness should follow the same contract, even if it cannot use Hermes tools directly:

- read the local workspace instructions;
- load the shared Cockpit wiring protocol;
- identify the task ID;
- register harness/model/session;
- log meaningful progress;
- write artifacts and verification;
- close out cleanly.

This gives different tools one operating grammar.

## 7. Prompt to Give Any Harness Today

Use this when you want a harness to do work in any workspace and reliably log to Cockpit:

```text
You are working inside this workspace:
[ABSOLUTE_WORKSPACE_PATH]

Before doing the task, read and follow:
1. [ABSOLUTE_WORKSPACE_PATH]/CLAUDE.md
2. [ABSOLUTE_WORKSPACE_PATH]/SOUL.md
3. [ABSOLUTE_WORKSPACE_PATH]/CONTEXT.md
4. /Users/agentsmyth/workspaces/_shared/agent-protocols/cockpit-wiring.md

Cockpit task ID:
[TASK_ID]

Register yourself in Cockpit before execution using your actual harness name, active model name, and current session/run ID. Keep Cockpit updated with progress, blockers, artifacts, verification, and final status. Do not log secrets.

Task:
[PLAIN_ENGLISH_TASK]
```

If the task does not already exist in Cockpit, use this variant:

```text
You are working inside this workspace:
[ABSOLUTE_WORKSPACE_PATH]

Before doing the task, read and follow:
1. [ABSOLUTE_WORKSPACE_PATH]/CLAUDE.md
2. [ABSOLUTE_WORKSPACE_PATH]/SOUL.md
3. [ABSOLUTE_WORKSPACE_PATH]/CONTEXT.md
4. /Users/agentsmyth/workspaces/_shared/agent-protocols/cockpit-wiring.md

Create or discover the relevant Cockpit task first, then register your harness/model/session footprint before execution. Keep Cockpit updated with progress, blockers, artifacts, verification, and final status. Do not log secrets.

Task:
[PLAIN_ENGLISH_TASK]
```

## 8. Burnt-In Workspace Feature Recommendation

The good news: the key burn-in already exists in the active workspace structure.

The root `CLAUDE.md` files for these workspaces already include a mandatory line telling agents to use Cockpit wiring before executing tasks:

- `/Users/agentsmyth/workspaces/om/CLAUDE.md`
- `/Users/agentsmyth/workspaces/bf/CLAUDE.md`
- `/Users/agentsmyth/workspaces/korus/CLAUDE.md`

The central protocol already exists here:

`/Users/agentsmyth/workspaces/_shared/agent-protocols/cockpit-wiring.md`

That means a properly behaving harness that reads the workspace `CLAUDE.md` should already be forced into the Cockpit logging loop.

Recommended next hardening steps:

1. Update `cockpit-wiring.md` so examples include bearer-token auth and the new metric fields.
2. Add a small CLI wrapper, e.g. `cockpit-task`, under `_shared/tools/`, so harnesses do not have to hand-write curl calls.
3. Add a workspace-local `.cockpit/config.json` or shared `.cockpit/workspace.json` convention mapping workspace folders to Cockpit workspace IDs.
4. Add a preflight check to kickoff: if a task is execution-oriented and no Cockpit task ID is known, create/discover one before work starts.
5. Add dashboard-side task event endpoints for richer progress events instead of overloading generic task PATCH updates.
6. Eventually make the harness launcher inject `COCKPIT_TASK_ID`, `COCKPIT_WORKSPACE_ID`, `COCKPIT_HARNESS_NAME`, `COCKPIT_MODEL`, and `COCKPIT_SESSION_ID` automatically.

The ideal future prompt becomes simply:

```text
Work on [task] in ~/workspaces/korus.
```

The workspace and launcher should do the rest.

## 9. Immediate Next Implementation Tasks

Recommended next tasks for a future agent:

1. Build `_shared/tools/cockpit-task` wrapper:
   - `cockpit-task claim <task_id>`
   - `cockpit-task progress <task_id> "message"`
   - `cockpit-task block <task_id> "reason"`
   - `cockpit-task done <task_id> "summary"`
   - auto-detect harness/model/session env vars where possible.
2. Add `/api/tasks/[id]/events` endpoint for rich structured task events.
3. Add metric columns or JSON metadata conventions for:
   - duration;
   - outcome;
   - artifact links;
   - human intervention;
   - token/cost metrics.
4. Add visible task timeline panel to `components/task-dialog.tsx`.
5. Add log filters for:
   - harness;
   - model;
   - session ID;
   - workspace;
   - result/outcome;
   - blocked/failure reasons.
6. Update workspace kickoff protocol so Cockpit task discovery/check-in is explicitly part of task execution starts.

## 10. Safe Resume Prompt for Future Agents

```text
Read this handoff first:
/Users/agentsmyth/workspaces/om/projects/cockpit/2026-05-26-cockpit-ops-v5-execution-footprint-and-productivity-log.md

Then work in:
/Users/agentsmyth/workspaces/dev/cockpit

Current architecture direction: Cockpit / OPS v5. Treat docs/current as source of truth.

Today Cockpit was updated so harnesses/functions can be assigned to tasks and model/session provenance is recorded in task records and activity logs. Latest verified commit: 02ad77d.

Next recommended implementation: build structured task-event logging and a reusable cockpit-task CLI wrapper so every workspace harness can claim/progress/block/done tasks without hand-written curl. Do not log secrets. Run build before committing Cockpit code changes.
```
