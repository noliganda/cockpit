# Cockpit — Design System (OM / Bayfield Deepened)

> Aligned 2026-07-07 with the Olivier Marcolin brand system
> (`~/workspaces/om/olivier-marcolin-design-system/`, claude.ai/design project `019e1bf6…`).
> Spec + decision log: `docs/journal/2026-07-07-ui-refresh-om-alignment-SPEC.md`.
> Mechanical token map: `scripts/design/om-sweep.mjs`.

## Identity

**Who:** Olivier Marcolin — producer & system designer. Byron Film + KORUS Group APAC, run from Ocean Shores. Opens this between calls, on set, on iPad on the couch.

**What:** Cockpit — the operational system of record. Tasks, dispatch, messages, CRM, metrics. Used daily, needs to feel like home.

**Feel:** A producer's editorial terminal. Cinematic, analog-warm, restrained. Dense but breathing. *"Not the artist. The producer & system designer."*

## Direction

- **Foundation:** Walnut — warm dark, never pure black, never blue-dark
- **Depth:** Borders-only (taupe hairlines) + the vignette. **No shadows, ever.**
- **Corners:** Radius 0. The brand has no curves — except discs (`rounded-full` dots/avatars)
- **Atmosphere:** Film grain (5%, overlay) + radial vignette on every screen — mounted once in `app/layout.tsx`
- **Signature:** Workspace identity through warm-tuned accent color; brick is the app's own accent — punctuation, never surface

## Tokens

### Surfaces (Walnut ramp)
```
--bg-base:      #14100C    /* App canvas — walnut */
--bg-surface-1: #1A1510    /* Cards, panels */
--bg-surface-2: #201A14    /* Elevated, active states */
--bg-surface-3: #272018    /* Dropdowns, popovers */
--bg-inset:     #0F0C09    /* Inputs, recessed areas */
```
Scrims: `rgba(10,8,6,0.7)`.

### Borders (taupe hairlines — the `--rule` family)
```
--border-subtle:   rgba(167,155,120,0.09)
--border-default:  rgba(167,155,120,0.14)   /* --rule */
--border-strong:   rgba(167,155,120,0.22)
--border-stronger: rgba(167,155,120,0.32)   /* --rule-strong */
```

### Text (Field Beige ramp)
```
--text-primary:   #E8DFCE   /* fg-strong — highest contrast on walnut */
--text-secondary: #A79B78   /* Field Beige — body on dark */
--text-tertiary:  #7A6F55   /* Metadata, timestamps */
--text-muted:     #5C5340   /* Disabled, placeholder */
```

### Accents
```
--brick:           #8B3A23   /* App accent: focus, links, active nav. NEVER a button fill */
--brick-warm:      #A04A30   /* Brick hover only */
--accent-bf:       #C99A1F   /* Byron Film — gold */
--accent-korus:    #3E7A70   /* KORUS — warmed teal */
--accent-personal: #C96F2E   /* Personal — terracotta */
```
Workspace accents are functional identity (sidebar indicator, stat icons, switcher dot) — kept per Oli's 2026-07-07 decision, warm-tuned to sit in the palette.

### Semantic (warm-tuned — the brand has no blue)
```
--color-success:  #7D9B5E
--color-warning:  #C9962E
--color-danger:   #C0452E   /* distinct from brick */
--color-info:     #5F7A72
```

### Typography
```
Display:  Fraunces  (variable: opsz + SOFT) — page titles, marquee numbers' labels
Body:     Newsreader (variable: opsz, italic for emphasis) — all body text
Mono:     JetBrains Mono — labels, nav, data, stats, IDs
```
- Page title: `font-display text-[26px] font-medium` (Fraunces, `SOFT 30`, −0.01em — the `.font-display` helper in globals.css adds the variation settings)
- Labels/nav: JetBrains Mono, UPPERCASE, `tracking-[0.2em]`, 10–11px
- Body: Newsreader 14–15px, line-height ≥1.5; *italics for emphasis, never bold body*
- Data/stats: JetBrains Mono, tabular-nums
- Fonts load via `next/font/google` in `app/layout.tsx` (`--font-fraunces`, `--font-newsreader`, `--font-jbm`)

### Radius
```
All rectangle radii: 0 (set at @theme level — rounded-sm/md/lg/xl all resolve to 0)
--radius-full: 9999px (dots, avatars, pills that are genuinely discs)
```

### Spacing
Base 4px; scale 4, 8, 12, 16, 20, 24, 32, 40, 48. Let sections breathe — generous top padding on page headers.

## Patterns

### Atmosphere (mandatory, already global)
`.grain` + `.vignette` divs are mounted in `app/layout.tsx` on every page including login. Don't re-add per page; don't remove.

### Sidebar
- Background = canvas (`--bg-base`), right hairline border
- Nav labels: JetBrains Mono 11px UPPERCASE `tracking-[0.2em]`
- Active: `--bg-surface-2` + 2px left border in workspace color
- Workspace switcher: colored dot (no emoji — emoji are banned from chrome)

### Stat cards
- `--bg-surface-1`, hairline border, radius 0
- Value: JetBrains Mono, 28px, tabular
- Label: mono uppercase tracked, `--text-secondary`

### Buttons & interaction
- Primary action: hairline border + brick text/underline — **brick is never a fill**
- Hover: `opacity 0.7` on labels; surface tint elsewhere; press: opacity ~0.5, no shrink, no shadow
- Focus: `--border-stronger` or brick outline
- Easing `cubic-bezier(0.25,0.1,0.25,1)`; no bounces, no springs; honor `prefers-reduced-motion`

### Iconography
- Lucide at stroke ~1.5 (the brand's sanctioned exception for app surfaces)
- **No emoji in chrome.** Workspace = colored dot; when something must be marked, use a mono label, a hairline, or a dot
- Em-dash — is the separator of choice

### Empty states
Centered, `--text-tertiary`, single line, optional action. No illustrations.

## Workspace-Specific Rules

### Region Property
- **KORUS only** — never show region selector on Byron Film or Personal workspaces
- Regions: Singapore, Australia, France, Global

### Status Options (per workspace)
- **Byron Film:** Backlog → Pre-Prod → In Prod → Post-Prod → Review → Delivered → Invoiced → Paid
- **KORUS:** Lead → Qualification → Proposal → Negotiation → Won → Lost → On Hold
- **Personal:** To Do → In Progress → Completed

### Areas
- **Byron Film:** Leadership, Finances, Operations, Growth, Production, Service, Sales, Marketing + AI/Automations + Private
- **KORUS:** Leadership, Finances, Operations, Growth, Production, Service, Sales, Marketing
- **Personal:** Flexible/custom

## Anti-Patterns

- ❌ Pure black (#000) or pure white (#FFF) — walnut `#14100C` / fg-strong `#E8DFCE`
- ❌ Any shadow (`shadow-*`) — depth is borders + vignette
- ❌ Rounded rectangle corners — radius 0 (discs excepted)
- ❌ Blue, purple, pink — warm-map them (see `om-sweep.mjs` table)
- ❌ Brick as a button/background fill — it is punctuation
- ❌ Emoji in chrome (workspace icons, nav, buttons)
- ❌ Cool grays (`#6B7280` family) — use the beige ramp
- ❌ White-alpha borders `rgba(255,255,255,…)` — use taupe `rgba(167,155,120,…)`
- ❌ Bold body text — use Newsreader italic for emphasis
- ❌ Marketing verbs, exclamation marks, title case in body
