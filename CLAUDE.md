# CLAUDE.md — Agent Instructions

## First Steps
1. Read SPEC.md — the full master specification
2. Read .interface-design/system.md — design system tokens and patterns
3. Read .env.local — environment variables

## Build Order
Execute ALL 5 phases from SPEC.md sequentially (1→2→3→4→5).

## After Each Phase
1. Run `npm run build` — fix ALL errors before moving on
2. Write status to `/tmp/dashboard-v4-status.txt`
3. `git add -A && git commit -m '<phase commit message>'`

## When Finished
1. Write "V4_BUILD_COMPLETE" to `/tmp/dashboard-v4-status.txt`
2. Run: `openclaw system event --text "Done: OPS Dashboard v4 — all 5 phases complete" --mode now`

## Key Design Rules
- Sidebar bg = canvas bg (#0F0F0F)
- Borders = rgba(255,255,255,0.06)
- Text = #F5F5F5 (not pure white)
- font-sans class on body element
- No shadows — borders-only
