# CLAUDE.md — Agent Instructions

## First Steps
1. Read SPEC.md — the unified master specification (all phases)
2. Read .interface-design/system.md — design system tokens and patterns
3. Read .env.local — environment variables
4. Check Section 4 of SPEC.md for current phase status

## Current Phase
**Phase 8** — Oli UX Feedback (items 8.1–8.10)
**Phase 9** — Bug Fixes + Core Completion (Sections A/B/C)

Detailed specs for Phase 8 and 9 are also in PHASE8.md and PHASE9.md for granular reference.

## After Each Milestone
1. Run `npm run build` — fix ALL errors before moving on
2. Write status to `/tmp/dashboard-v4-status.txt`
3. `git add -A && git commit -m '<descriptive commit message>'`

## When Finished
1. Write "PHASE_X_COMPLETE" to `/tmp/dashboard-v4-status.txt`
2. Run: `openclaw system event --text "Done: <phase summary>" --mode now`

## Key Design Rules
- Sidebar bg = canvas bg (#0F0F0F)
- Borders = rgba(255,255,255,0.06)
- Text = #F5F5F5 (not pure white)
- font-sans class on body element
- No shadows — borders-only depth
