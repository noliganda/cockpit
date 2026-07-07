# UI Refresh — Align Cockpit with the Olivier Marcolin Design System

**Date:** 2026-07-07 · **Cockpit task:** 22f56eca · **Source of truth:** `~/workspaces/om/olivier-marcolin-design-system/` (local export of claude.ai/design project `019e1bf6…`, verified same bundle namespace)

## Goal

Re-skin Cockpit from the neutral-dark "Linear meets Vercel" system to the OM brand system (Bayfield Deepened palette, Fraunces/Newsreader/JetBrains Mono, radius-0, grain+vignette atmosphere) — while keeping Cockpit's density, information hierarchy, and workspace color-coding intact. Chrome speaks OM; data keeps its functional color language.

## Decisions (Oli, 2026-07-07)

1. **Typography: full adoption.** Newsreader body, Fraunces display, JetBrains Mono labels/data. Rollback is a font-variable change.
2. **Workspace accents: keep, warm-tuned.** BF `#C99A1F`, KORUS `#3E7A70`, Personal `#C96F2E`. Brick `#8B3A23` becomes the app-level accent (focus, links, active nav, primary actions — never a button background per brand rules).

## Current-state facts (measured)

- 91 `.tsx` files in `app/` + `components/`; **zero** use the `@theme` tokens — 1,209 hardcoded hex sites + 577 hardcoded `rgba(255,255,255,…)` borders. The refresh is therefore a deterministic find-replace sweep, not a token rewire.
- 533 `rounded-*` classes resolve through Tailwind v4 radius theme vars → radius-0 is a `@theme` edit (keep `rounded-full` at 9999px — dots/avatars stay discs; "no curves" applies to rectangles).
- Workspace colors + emoji icons centralized in `types/index.ts` `WORKSPACES`; emoji banned by brand → colored dot / mono code in chrome.
- Fonts: `geist` package in `app/layout.tsx` → replace with `next/font/google` (Fraunces w/ `SOFT`+`opsz` axes, Newsreader, JetBrains Mono).

## Token map (complete, from census)

### Surfaces
| Old | New | Role |
|---|---|---|
| `#0F0F0F` | `#1A1410` | base (walnut) |
| `#141414` | `#211913` | surface-1 |
| `#1A1A1A` | `#281E16` | surface-2 |
| `#222222` | `#2F241A` | surface-3 |
| `#0A0A0A` | `#140F0B` | inset |
| `bg-black/60` | `bg-[rgba(15,11,8,0.7)]` | scrims |

### Text
| Old | New | Role |
|---|---|---|
| `#F5F5F5` | `#E8DFCE` | primary (fg-strong) |
| `#A0A0A0` | `#A79B78` | secondary (Field Beige) |
| `#6B7280` | `#7A6F55` | tertiary |
| `#4B5563` | `#5C5340` | muted |
| `#374151` | `#4A4234` | faint |
| `#E5E7EB` | `#E8DFCE` | stray light |
| `text-white` / `bg-white` / `border-white` | `#E8DFCE` equivalents | |
| `text-black` | `#1A1410` | text on accent fills |
| `text-gray-400` | `#A79B78` | |

### Borders — formula
`rgba(255,255,255,a)` → `rgba(167,155,120, round(a×2.2, cap 0.9))`. Canonical stops: 0.04→0.09, 0.06→0.14 (`--rule`), 0.10→0.22, 0.16→0.32.

### Accents & semantics
| Old | New | Note |
|---|---|---|
| `#D4A017` | `#C99A1F` | Byron Film gold |
| `#008080` | `#3E7A70` | KORUS teal, warmed |
| `#F97316` | `#C96F2E` | Personal terracotta |
| `#22C55E` | `#7D9B5E` | success |
| `#F59E0B` | `#C9962E` | warning |
| `#EF4444` | `#C0452E` | danger (distinct from brick) |
| `#3B82F6` | `#5F7A72` | info — "the brand has no blue" |
| `#60A5FA` | `#6E8B7E` | info-light |
| `#8B5CF6` / `#A855F7` | `#9B6B4F` | purple → sienna |
| `#EC4899` | `#B0584A` | pink → clay |
| `#14B8A6` | `#4A8578` | agent teal |
| `#2A9D8F` | `#3E7A70` | chart teal → KORUS |
| `#F4A261` | `#C98A54` | chart amber |
| `#E63946` | `#B54334` | chart red |
| new | `#8B3A23` (`--brick`) | app accent: focus, links, active nav; `#a04a30` hover |

Selection: `rgba(139,58,35,0.35)`. Scrollbar thumb: `rgba(167,155,120,0.25)`.

### Typography
- `--font-sans` → Newsreader stack (body inherits everywhere without class churn); `--font-mono` → JetBrains Mono; new `--font-display` → Fraunces.
- Page titles (manual pass): Fraunces via `font-display`, weight 400–500, `SOFT 30`; body stays 14–15px but line-height ≥1.5.
- Existing uppercase label patterns get `font-mono` + `tracking-[0.2em]` where already-tracked.

### Atmosphere (mandatory per brand)
`.grain` (SVG feTurbulence data-URI, `opacity:0.05`, `mix-blend-mode:overlay`) + `.vignette` (radial to `rgba(0,0,0,0.4)`), both `fixed inset-0 pointer-events-none`, mounted once in `AppShell`. Honors `prefers-reduced-motion` (static layers, no animation).

## Implementation plan

1. **Foundation** — `globals.css` `@theme` rewrite (new tokens, radius-0, fonts), `layout.tsx` font swap, atmosphere layers in `app-shell.tsx`. Build.
2. **Sweep** — `scripts/design/om-sweep.mjs`: applies the token map hex→hex (works in every context: className, inline style, SVG/recharts attrs); reports any unmapped color left behind. Build.
3. **Manual pass** — page titles → Fraunces; workspace emoji → colored dots (chrome only); selection/scrollbar/focus; spot-fix sweep survivors. Build.
4. **Docs** — rewrite `.interface-design/system.md` as the OM-Cockpit system (this spec's tokens become the canonical doc).
5. **Verify** — `npm run build`, dev server screenshots of /, /tasks, /dispatch, /messages, /metrics; mobile spot-check. Commit per milestone.

## Out of scope / flagged

- Agent emoji in `types/index.ts` (🎯💰📝🛠️) render as data in dispatch/agents views — left as-is this pass; candidate for mono-initial badges later.
- Handover design nits (mobile chat bubble overlap on /messages; raw `generated_by` slug) — bundled into the manual pass if trivial, else remain open.
- Subdomain move to `cockpit.oliviermarcolin.com` — assessed separately (easy, ~1h); not part of this run.
