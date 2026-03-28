# CLAUDE.md — Agent Instructions

## First Steps
1. Read `README.md` — repo map and current framing
2. Read `docs/INDEX.md` — docs navigation
3. Read `docs/current/architecture/OPS-V5-INTAKE-ROUTING-AND-EXECUTION-MODEL.md`
4. Read `docs/current/architecture/OPS-V5-ROLLOUT-PLAN-CHARLIE-DEVON-CLAUDE.md`
5. Read `.interface-design/system.md` — design system tokens and patterns
6. Read `.env.local` — environment variables

## Current State
Current product direction is **Cockpit / OPS v5**.
Treat `docs/current/` as the live source of truth.
Treat `docs/versions/v4-ops-dashboard/` as historical reference only.

## After Each Milestone
1. Run `npm run build` — fix ALL errors before moving on
2. Write status to `/tmp/cockpit-status.txt`
3. `git add -A && git commit -m '<descriptive commit message>'`

## When Finished
1. Write "MILESTONE_COMPLETE" to `/tmp/cockpit-status.txt`
2. Summarise what changed, what is now true, and what remains next

## Key Design Rules
- Sidebar bg = canvas bg (#0F0F0F)
- Borders = rgba(255,255,255,0.06)
- Text = #F5F5F5 (not pure white)
- font-sans class on body element
- No shadows — borders-only depth
