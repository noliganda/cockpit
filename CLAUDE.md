# CLAUDE.md — Agent Instructions

## First Steps
1. Read SPEC.md — the unified master specification (all phases)
2. Read .interface-design/system.md — design system tokens and patterns
3. Read .env.local — environment variables
4. Check Section 4 of SPEC.md for current phase status

## Current State
Phases 1–10, Blocks 1–4, Productivity Dashboard, and Bases v2 are **all complete**.
Nothing has been pushed to GitHub yet — all work is local on `main`.
Check Section 4 of SPEC.md for the full status tracker.

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
