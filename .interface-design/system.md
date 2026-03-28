# Ops Dashboard — Design System

## Identity

**Who:** Olivier Marcolin — CEO running two businesses (film production + commercial fit-out) from Byron Bay. Opens this between calls, on set, on iPad on the couch. Not a developer — wants it to feel like a premium tool, not a coding project.

**What:** Unified operations dashboard replacing Notion. Tasks, projects, CRM, sprints, metrics. Used daily, needs to feel like home.

**Feel:** Command center for a one-person army. Dense but not cramped. Calm authority. Like Linear meets Vercel — precision without coldness. The kind of tool where you open it and immediately know where you stand.

## Direction

- **Personality:** Precision & Density with warmth from workspace accent colors
- **Foundation:** Neutral dark (not blue-dark, not warm-dark — true neutral)
- **Depth:** Borders-only with subtle surface elevation shifts
- **Signature:** Workspace identity through color — a thin accent line or glow that tells you which world you're in (Byron Film gold, KORUS teal, Personal orange)

## Tokens

### Surfaces (Dark Mode — Neutral)
```
--bg-base:      #0F0F0F    /* App canvas */
--bg-surface-1: #141414    /* Cards, panels — barely above base */
--bg-surface-2: #1A1A1A    /* Elevated cards, active states */
--bg-surface-3: #222222    /* Dropdowns, popovers, hover */
--bg-inset:     #0A0A0A    /* Inputs, recessed areas */
```

### Borders
```
--border-default:  rgba(255, 255, 255, 0.06)   /* Standard separation */
--border-subtle:   rgba(255, 255, 255, 0.04)   /* Softer separation */
--border-strong:   rgba(255, 255, 255, 0.10)   /* Emphasis, hover */
--border-stronger: rgba(255, 255, 255, 0.16)   /* Focus rings */
```

### Text
```
--text-primary:   #F5F5F5   /* Not pure white — slightly softer */
--text-secondary: #A0A0A0   /* Supporting text */
--text-tertiary:  #6B7280   /* Metadata, timestamps */
--text-muted:     #4B5563   /* Disabled, placeholder */
```

### Workspace Accents
```
--accent-bf:       #D4A017   /* Byron Film — warm gold */
--accent-korus:    #008080   /* KORUS — teal */
--accent-personal: #F97316   /* Personal — orange */
```
Each workspace accent is used for:
- Active sidebar indicator (left border or background tint)
- Stat card icons/badges
- Active tab underlines
- Workspace switcher dot
- Page title accent (optional subtle use)

### Semantic
```
--color-success:  #22C55E
--color-warning:  #F59E0B
--color-danger:   #EF4444
--color-info:     #3B82F6
```
Slightly desaturated in dark mode. Never used purely for decoration.

### Spacing
```
Base: 4px
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48
```
- Micro: 4px (icon gaps, tight pairs)
- Component: 8-12px (within buttons, inputs)
- Card padding: 16-20px
- Section gap: 24-32px
- Major separation: 40-48px

### Border Radius
```
--radius-sm: 6px    /* Inputs, buttons, badges */
--radius-md: 8px    /* Cards, dialogs */
--radius-lg: 12px   /* Large containers, modals */
--radius-full: 9999px  /* Pills, avatars */
```

### Typography
```
Font: Geist Sans (headings + body), Geist Mono (data, stats, IDs)
```
- Page title: 24px / 700 / -0.02em tracking
- Section heading: 16px / 600
- Body: 14px / 400
- Label: 12px / 500 / 0.02em tracking / uppercase for form labels
- Data/stat: Geist Mono / 24-32px / 600 / tabular-nums

## Patterns

### Sidebar
- Width: 240px (collapsed: 56px)
- Background: same as --bg-base (NOT different color)
- Right border: var(--border-default)
- Active link: bg-surface-2 + left 2px accent border in workspace color
- Hover: bg-surface-1
- Icons: 16px, --text-tertiary (active: --text-primary)
- Nav items: 32px height, 8px padding horizontal

### Stat Cards
- bg-surface-1 with border-default
- 16px padding
- Icon in top-right with 10% opacity workspace accent background
- Value: Geist Mono, 28px, 600
- Label: 12px, --text-secondary
- Sublabel: 11px, --text-tertiary

### Data Tables
- Header: --text-tertiary, 12px, 500, uppercase
- Row hover: bg-surface-1
- Row border: border-subtle
- Cell padding: 12px horizontal, 10px vertical
- On mobile: collapse to card layout, NOT horizontal scroll

### Task Cards (Kanban)
- bg-surface-1, border-default, radius-md
- 12px padding
- Title: 14px/500
- Meta row: badges + due date + assignee avatar
- Priority dot: left edge, 3px width, colored by priority
- Drag handle: visible on hover

### Empty States
- Centered, --text-tertiary
- Single line description
- Optional action button
- No illustrations (keep it clean)

### Command Palette
- bg-surface-2, border-strong, radius-lg
- Centered overlay with backdrop blur
- Input at top (bg-inset)
- Results list with keyboard navigation

## Workspace-Specific Rules

### Region Property
- **KORUS only** — never show region selector on Byron Film or Personal workspaces
- Regions: 🇸🇬 Singapore, 🇦🇺 Australia, 🇫🇷 France, 🌏 Global

### Status Options (per workspace)
- **Byron Film:** Backlog → Pre-Prod → In Prod → Post-Prod → Review → Delivered → Invoiced → Paid
- **KORUS:** Lead → Qualification → Proposal → Negotiation → Won → Lost → On Hold
- **Personal:** To Do → In Progress → Completed

### Areas
- **Byron Film:** Leadership, Finances, Operations, Growth, Production, Service, Sales, Marketing + AI/Automations + Private
- **KORUS:** Leadership, Finances, Operations, Growth, Production, Service, Sales, Marketing
- **Personal:** Flexible/custom

## Anti-Patterns

- ❌ Pure white text (#FFFFFF) — use #F5F5F5
- ❌ Sidebar different background color from canvas
- ❌ Dramatic surface jumps between elevation levels
- ❌ Generic blue accent — always use workspace color
- ❌ Region selector outside KORUS workspace
- ❌ Chat widget bubble (removed — Phase 5+ feature)
- ❌ Harsh 1px solid borders — use rgba
- ❌ Cards without visible border/elevation distinction
- ❌ Missing hover/focus/active states
- ❌ Monospace font for non-data text
