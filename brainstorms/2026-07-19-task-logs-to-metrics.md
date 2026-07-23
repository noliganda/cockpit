# Task Logs → Metrics Section: Brainstorm / Discovery Notes
Date: 2026-07-19 · Goal: Resolve the measurement semantics that stalled the last attempt, so task logs can be wired into `/metrics/productivity`.

## Background (verified 2026-07-19)
- **The spine works**, the last mile doesn't. `activity_log` = 7,570 rows; 1,141 task-family events with full provenance (harness/model/session), timeline UI, `cockpit-task` CLI, dispatch engine — all live.
- **The disconnect:** `/metrics/productivity` (`app/metrics/productivity/page.tsx`) reads `activity_log` columns `category`, `duration_minutes`, `estimated_manual_minutes`, `human_intervention`, `interventionType`, `api_cost_usd`, filtered to `category IS NOT NULL`. Only **85 legacy/seeded rows** have `category`/`duration_minutes`. The 1,141 real task events have them all `null`. So the dashboard shows stale seeded data, blind to real work.
- `logActivity()` accepts all these fields (optional) but no task/dispatch/`cockpit-task` write path passes them.
- **Why it needed a re-spec:** the fields were designed for human-logged work; the semantics don't map cleanly onto agent execution. That's the crux to resolve here.
- Source docs: `docs/journal/2026-05-26-cockpit-ops-v5-execution-footprint-and-productivity-log.md` (§5 field taxonomy), `docs/journal/2026-06-30-roadmap-reconcile-and-task-timeline.md`, `docs/current/architecture/OPS-V5-INTAKE-ROUTING-AND-EXECUTION-MODEL.md`.

## Summary / key decisions
- **PURPOSE (Q1): This is a proof-of-concept for Oli's AI consultancy engagement with Korus Group, NOT Oli's internal ops view.** The metrics section is a *comparison instrument*: measure a person's productivity **with AI-assistance vs without AI (human-only, no AI)**. Compared dimensions: **model used, cost, and time-to-complete**, AI-assisted vs human-only.
- Likely ties to the existing KORUS AI-mission work (`~/workspaces/korus/operations/projects/ai-mission`). Subjects are probably Korus Group staff/tasks → the human-only baseline can come from real Korus people doing real tasks.
- Implication: the current schema is missing a **"mode" dimension (ai_assisted | human_only)** and a **way to capture human-only baseline runs** (Cockpit today only logs AI/agent execution). This is bigger than populating 4 fields — it's experiment design + a new data-capture path.
- Audience = external (Korus Group, the client), so the output must be *demonstrably credible*, not just indicative.

### SCOPE SPLIT (decided Q2) — two separate systems:
- **SYSTEM 1 — Cockpit individual self-eval (BUILD NOW, the immediate POC).** Just Oli's *own* AI-assisted performance analytics: where my time goes, how many tasks done, avg time per task, task type breakdown, model used, cost. **NO human-without-AI comparison.** Purpose = showcase that we can extract stats + graphs from the log and make performance evaluation obvious. Achievable now from mostly-existing data.
- **SYSTEM 2 — KORUS comparison tool (BUILD LATER, separate).** The full with-AI-vs-without-AI instrument (Q2 recommendation: matched task templates, time+cost head-to-head). One of the first real tools to build *for* Korus. Deferred.
- **Test-group capacity question (Oli asked):** Correct — Cockpit can't accommodate a Korus test group as-is. Gaps: per-user human auth (today = single admin + read-only guest), a human-only time-capture UI, a `mode` (ai_assisted|human_only) dimension, per-user data isolation. Foundations exist (operators table holds humans; scoped guest session precedent for /metrics/korus) but it's a real build = System 2, not the POC. Nuance: a controlled "one operator logs both runs of standardized tasks" design could do a Korus POC *without* full multi-user expansion — an option for System 2.

## Q&A log
### Q1 — Purpose / audience of the metrics section
- Asked: What is the metrics section for, and for whom?
- Captured: POC for the AI consultancy Oli is doing **with Korus Group** ("acourse" was a transcription typo for Korus Group). Core idea = measure productivity of "someone" **with vs without AI**. Comparing **the model, the cost, and how quickly tasks are achieved** when AI-assisted vs human-operated-without-AI. (Not internal ROI, not per-client billing, not agent-vs-agent routing.)
- Flags: none

### DATA REALITY (verified live 2026-07-22, after Neon→Launch restored the DB)
Basis: 190 Done tasks.
- **Attribution = solved.** 189/190 Done tasks have an execution footprint (`executing_session_id`). So "AI-assisted" is basically *all* completed work — no filtering headache.
- **Duration = the real problem.** Only **32/190 (17%)** have both `started_at`+`completed_at` (clean wall-clock); **158 skipped In Progress** so have no `started_at`. BUT **189/190 have ≥2 `task_events`** → an **event-span proxy** (first event → last event) is available for ~99%. → Recommend duration = event-span, not started→completed. Separately, enforce the In Progress transition going forward so `started_at` is reliable.
- **Type/category dimension = essentially empty.** `area_id` set on 12/190 (6%), `tags` 0, `object_type` null. Only populated grouping = **`workspace_id`** (personal 144, korus 42, byron-film 4). → "type of task" / "where my time goes (by type)" has NO data today; needs a decision (introduce + populate a task-type, or derive one, or ship v1 grouped by workspace only).
- Assignee naming is messy (Claude Code / claude-code / "agent", type function vs agent) — normalize if we do per-operator/per-model cuts.

### Q3 — Unit + attribution + duration (RESOLVED by data; confirm)
- Recommendation: **unit = Cockpit task (incl. subtasks); population = tasks with execution footprint (189/190); duration = event-span (first→last task_event, ~99% coverage)**, with started→completed preferred where present and In Progress enforced going forward.
- Status: awaiting Oli confirm.

### Q2 — Comparison unit (matched tasks vs throughput)?
- Asked: Matched task templates (A), cohort throughput (B), or hybrid (C)? Who runs the human-only side?
- Captured: **REDIRECTED into a scope split (see above).** The comparison instrument (A, matched tasks) is the *KORUS* System-2 build for later. **Right now Cockpit = System 1 only: Oli's individual AI-assisted self-eval, no human baseline.** So the `estimated_manual_minutes` / time-saved field is OUT of the immediate build (it belongs to System 2).
- Flags: System 2 (Korus comparison) design → revisit when we build it; test-group multi-user capacity is a real build, not POC.

## Open flags (pending input)
- **Neon DB quota exceeded (HTTP 402) on 2026-07-22** — blocks live data verification for this build AND degrading the production Cockpit app. Resolved-diagnosis (read live from Vercel→Neon integration page): plan = **Free** (100 CU-hours/project/mo hard cap; **no payment method on file**), so it hard-walls when the cap is hit. Root cause: `com.cockpit.dispatch-poll` fires every 3 min < Neon's 5-min autosuspend → DB never scales to zero → burns compute ~24/7. **Recommendation:** bump to **Launch** (metered $0.106/CU-hour, 16 CU ceiling, no hard wall; add payment method) AND widen the poll interval / restore scale-to-zero. NOT Scale ($0.222/CU-hour, overkill). → Oli (financial decision). Full breakdown given in /btw fork. **RESOLVED 2026-07-22: Oli upgraded to Launch; DB confirmed serving again.** STILL PENDING: scale-to-zero fix — dispatch-poll every 3min < 5min autosuspend keeps compute warm 24/7 → now real $ on metered Launch. Best fix = shorten Neon autosuspend below the 3-min poll (keeps dispatch latency) OR widen poll interval.
- System 2 (Korus with/without-AI comparison) full design → revisit when built.
