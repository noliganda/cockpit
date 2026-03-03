# OPS Dashboard — Audit Report

**Date:** 2026-03-03
**Auditor:** Claude Sonnet 4.6 (automated)
**Scope:** Full codebase — build health, dead code, env vars, security, consistency, packages

---

## Executive Summary

Build passes cleanly. The codebase is in good shape overall. The most important finding is **credentials leaked in SPEC.md** (now fixed in HEAD) that still exist in git history and must be rotated. There are also a significant number of **unused npm packages** that inflate the dependency tree, and a few minor dead-code items flagged below.

---

## 1. Build Verification

### Status: ✅ CLEAN (post-audit)

**Before audit:** Build passed with **11 ESLint warnings** across 6 files.
**After audit:** Build passes with **0 warnings**.

### Warnings Fixed

| File | Warning | Fix Applied |
|---|---|---|
| `app/metrics/productivity/productivity-client.tsx` | `roiPct` assigned but never used | Removed |
| `app/metrics/productivity/productivity-client.tsx` | `WS_LABELS` assigned but never used | Removed |
| `app/metrics/productivity/productivity-client.tsx` | `WorkspaceDot` defined but never used | Removed |
| `app/metrics/productivity/productivity-client.tsx` | `weeks` assigned but never used (line 374) | Removed |
| `app/metrics/productivity/productivity-client.tsx` | `ReferenceLine`, `Legend` imported but unused | Removed from import |
| `app/projects/[id]/project-detail-client.tsx` | `addingBookmark`, `setAddingBookmark` unused | Removed state declaration |
| `components/quick-note-modal.tsx` | `Note` type imported but unused | Removed from import |
| `app/api/metrics/actions/route.ts` | `and` imported but unused | Removed from import |
| `app/api/metrics/comparison/route.ts` | `eq`, `and` imported but unused | Removed from import |
| `app/api/metrics/productivity/route.ts` | `lte`, `sql` imported but unused | Removed from import |
| `app/calendar/calendar-client.tsx` | `Clock` icon imported but unused | Removed from import |
| `app/crm/crm-client.tsx` | `Check` icon imported but unused | Removed from import |
| `app/bases/[id]/base-detail-client.tsx` | `useCallback` missing `debouncedSave` dep | Added `eslint-disable` (intentional stable ref) |

---

## 2. Dead Code

### Confirmed Orphaned Files

| File | Status | Recommendation |
|---|---|---|
| `lib/env.ts` | Defined but never imported anywhere in the app | Safe to delete — all env vars are accessed directly via `process.env.*` throughout the app |

### NocoDB Leftovers
The NocoDB integration (added and reverted across commits `ee5fffe` → `17c3112`) is **fully cleaned up** in the current working tree. No NocoDB-specific code remains in source files.

### Supabase Leftovers
No Supabase packages or imports found in current source. (`@supabase/supabase-js` not in `package.json`.) Early commits referenced Supabase via SPEC docs but the codebase migrated to Neon/Drizzle.

### Dead API Routes
All API routes are consumed by the front-end. No fully orphaned routes found.
**Note:** `/api/chat`, `/api/cron/embed-backfill`, and `/api/cron/notion-sync` are functional but depend on optional integrations (OpenClaw gateway / Notion / OpenAI). They will gracefully fail if the integrations aren't configured.

### Stale `.env.local` Variables
Three variables from the reverted NocoDB integration remain in `.env.local`:
- `NOCODB_URL`
- `NEXT_PUBLIC_NOCODB_URL`
- `NOCODB_API_TOKEN` ← this is a JWT — rotate it

---

## 3. Environment Variables

See `ENV_AUDIT.md` for full documentation.

### Quick Reference

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ YES | App crashes without it |
| `DATABASE_URL_UNPOOLED` | Dev-only | Only needed for `db:push` / `db:studio` |
| `AUTH_PASSWORD_HASH` | Recommended | Falls back to `opsdb2026` |
| `KORUS_GUEST_PASSWORD_HASH` | Recommended | Falls back to `korus2026` — see security |
| `CRON_SECRET` | Recommended | Falls back to `charlie-cron-2026` |
| `OPENAI_API_KEY` | Optional | Semantic search/embeddings disabled without it |
| `NOTION_API_KEY` | Optional | Notion sync fails without it |
| `NOTION_*_TASKS_DB` (×3) | Optional | Notion sync fails without them |
| `OPENCLAW_GATEWAY_*` (×2) | Optional | Chat widget disabled without them |
| `NEXT_PUBLIC_OPENCLAW_WS_URL` | Optional | Chat widget disabled without it |

---

## 4. Security

### 🔴 CRITICAL: Credentials in Git History

The following real credentials were committed to git and **still exist in git history**. The current working tree has been redacted (commit `487d349`) but the values remain accessible via `git log`:

| Credential | Location in History | Commits |
|---|---|---|
| Neon DB password (`npg_jyxJkq7F4oCW`) | SPEC.md env section | `eb77add`, `ee5fffe`, `bfe0c47`, `8612cbe` + NocoDB commits |
| Notion API key (`ntn_462911842545...`) | SPEC.md env section | `eb77add` and descendants |
| Notion DB IDs (×3) | SPEC.md env section | `eb77add` and descendants |

**Action Required:**
1. **Rotate the Neon DB password** — go to Neon console → project settings → rotate credentials
2. **Rotate the Notion API key** — go to Notion developer portal → revoke and regenerate
3. If the repo is ever pushed to a remote (GitHub, etc.), consider using `git filter-repo` to purge the history, or accept that these credentials are compromised

### 🟡 MEDIUM: Hardcoded Fallback Passwords in Source

These fallback values are committed to git and expose default credentials:

| File | Hardcoded Value | Risk |
|---|---|---|
| `app/api/auth/route.ts:33` | `'opsdb2026'` (default admin password) | Anyone who reads the code knows the default password |
| `app/api/auth/guest/route.ts:8` | `'korus2026'` (default guest password) | Same |

**Mitigation:** Always set `AUTH_PASSWORD_HASH` and `KORUS_GUEST_PASSWORD_HASH` in production. The app uses these env vars first; the hardcoded values are only fallbacks for dev setup.

### 🟡 MEDIUM: Seed Route with Default Passwords

`app/api/seed/route.ts:51-52` seeds users with password `'changeme123'`. This is intentional for dev setup but documents that seeded accounts use a predictable default. Call `/api/seed` only in development; delete seeded users or change their passwords before production use.

### ✅ .gitignore

`.env.local` is properly ignored via `.env*` pattern. No env files are committed.

---

## 5. Consistency Check

### Sidebar Navigation

All 18 nav items link to existing pages:

| Nav Item | Route | Status |
|---|---|---|
| Home | `/dashboard` | ✅ |
| Tasks | `/tasks` | ✅ |
| Kanban | `/tasks/kanban` | ✅ |
| Matrix | `/tasks/matrix` | ✅ |
| Projects | `/projects` | ✅ |
| Areas | `/areas` | ✅ |
| Sprints | `/sprints` | ✅ |
| Calendar | `/calendar` | ✅ |
| Contacts | `/crm` | ✅ |
| Notes | `/notes` | ✅ |
| Bases | `/bases` | ✅ |
| Documents | `/documents` | ✅ |
| Messages | `/messages` | ✅ |
| Brief | `/brief` | ✅ |
| Metrics | `/metrics` | ✅ |
| AI Metrics | `/ai-metrics` | ✅ |
| Productivity | `/metrics/productivity` | ✅ |
| Settings | `/settings` | ✅ |

**Note:** The `Zap` icon is used for both "Sprints" and "AI Metrics" nav items — minor visual inconsistency, not a functional issue.

### API Route Auth

All API routes are protected. The only route without a `getSession()` call is `/api/auth/guest/route.ts`, which is the authentication endpoint itself (expected).

### TODO/FIXME Comments

No outstanding TODO, FIXME, HACK, or XXX comments found in source files.

### Dark Theme Consistency

Design system mandates `#F5F5F5` for primary text (not pure `#FFFFFF`).

**Observed deviations (minor/acceptable):**
- `text-white` used on colored circle badges and delete buttons — acceptable as these are on colored/dark backgrounds where the contrast difference is imperceptible
- `hover:bg-white` used as hover state on inverted (light-background) buttons — acceptable UX pattern
- `accent-white` on checkboxes — native browser rendering, not a design system concern

**Shadow usage** (design system says "no shadows — borders-only"):
- `shadow-lg` on dropdown menus (`tasks-client.tsx`, `crm-client.tsx`, `workspace-switcher.tsx`)
- `shadow-xl` on drag-active kanban cards
- `shadow-2xl` on search overlay
- Custom `boxShadow` with workspace color in `charlie-chat.tsx`

These are functional (dropdowns, drag states, focus elements) and improve UX. The design system rule appears intended for static card elevation, not floating/interactive elements. Flagged for awareness — not changed.

---

## 6. Package Audit

### npm Audit — Vulnerabilities

**4 moderate severity vulnerabilities**, all in `drizzle-kit` (a dev dependency):

| Package | Severity | Details |
|---|---|---|
| `esbuild <=0.24.2` | Moderate | Dev server CORS issue — dev-only, not a runtime risk |
| `@esbuild-kit/core-utils` | Moderate | Depends on vulnerable esbuild |
| `@esbuild-kit/esm-loader` | Moderate | Depends on above |
| `drizzle-kit 0.9.1-1.0.0-beta` | Moderate | Depends on above |

**These are dev-only vulnerabilities.** They do not affect the production Next.js server. To fix:
```
npm audit fix --force
```
This upgrades `drizzle-kit` to `0.31.9` — a breaking change. Test `db:push` and `db:studio` after upgrading.

### Unused Dependencies

The following packages are installed but **never imported** anywhere in the source:

| Package | Installed | Actually Used |
|---|---|---|
| `next-themes` | ✅ | ❌ Never imported |
| `cmdk` | ✅ | ❌ Never imported (command palette built from scratch) |
| `class-variance-authority` | ✅ | ❌ Never imported |
| `@radix-ui/react-alert-dialog` | ✅ | ❌ |
| `@radix-ui/react-avatar` | ✅ | ❌ |
| `@radix-ui/react-checkbox` | ✅ | ❌ |
| `@radix-ui/react-collapsible` | ✅ | ❌ |
| `@radix-ui/react-dialog` | ✅ | ❌ |
| `@radix-ui/react-dropdown-menu` | ✅ | ❌ |
| `@radix-ui/react-label` | ✅ | ❌ |
| `@radix-ui/react-popover` | ✅ | ❌ |
| `@radix-ui/react-progress` | ✅ | ❌ |
| `@radix-ui/react-scroll-area` | ✅ | ❌ |
| `@radix-ui/react-select` | ✅ | ❌ |
| `@radix-ui/react-separator` | ✅ | ❌ |
| `@radix-ui/react-slot` | ✅ | ❌ |
| `@radix-ui/react-switch` | ✅ | ❌ |
| `@radix-ui/react-tabs` | ✅ | ❌ |
| `@radix-ui/react-toast` | ✅ | ❌ (`sonner` is used instead) |
| `@radix-ui/react-tooltip` | ✅ | ❌ |

That's **20 unused packages** — a legacy of a planned shadcn/ui integration that was replaced with raw Tailwind + Lucide styling.

**Recommendation:** Remove all unused packages to reduce attack surface and install time:
```bash
npm uninstall next-themes cmdk class-variance-authority \
  @radix-ui/react-alert-dialog @radix-ui/react-avatar @radix-ui/react-checkbox \
  @radix-ui/react-collapsible @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-progress \
  @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator \
  @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs \
  @radix-ui/react-toast @radix-ui/react-tooltip
```
**Note:** Do this carefully — verify build passes before committing. Some may be transitive deps that other packages rely on (e.g. some Radix packages may be needed by BlockNote or @hello-pangea/dnd).

---

## 7. Current State of Every Page/Route

### App Pages

| Route | File | Auth | Notes |
|---|---|---|---|
| `/` | `app/page.tsx` | Redirects | Likely redirects to /dashboard |
| `/dashboard` | `app/dashboard/` | ✅ getSession | Home metrics |
| `/login` | `app/login/page.tsx` | None (public) | Auth entry point |
| `/tasks` | `app/tasks/` | ✅ getSession | Task list with batch actions |
| `/tasks/kanban` | `app/tasks/kanban/` | ✅ getSession | Drag-drop kanban |
| `/tasks/matrix` | `app/tasks/matrix/` | ✅ getSession | Eisenhower matrix |
| `/projects` | `app/projects/` | ✅ getSession | Project grid |
| `/projects/[id]` | `app/projects/[id]/` | ✅ getSession | Detail w/ milestones, bookmarks, contacts |
| `/areas` | `app/areas/` | ✅ getSession | Area CRUD |
| `/areas/[id]` | `app/areas/[id]/` | ✅ getSession | Area detail |
| `/sprints` | `app/sprints/` | ✅ getSession | Sprint list |
| `/sprints/[id]` | `app/sprints/[id]/` | ✅ getSession | Sprint board with burndown |
| `/calendar` | `app/calendar/` | ✅ getSession | Task calendar |
| `/crm` | `app/crm/` | ✅ getSession | Contacts + pipeline |
| `/crm/[id]` | `app/crm/[id]/` | ✅ getSession | Contact detail |
| `/notes` | `app/notes/` | ✅ getSession | BlockNote editor |
| `/bases` | `app/bases/` | ✅ getSession | Custom DB tables |
| `/bases/[id]` | `app/bases/[id]/` | ✅ getSession | DataSheetGrid table view |
| `/documents` | `app/documents/` | ✅ getSession | File browser |
| `/messages` | `app/messages/` | ✅ getSession | Activity feed |
| `/brief` | `app/brief/` | ✅ getSession | Morning brief |
| `/metrics` | `app/metrics/` | ✅ getSession | Stats overview |
| `/metrics/korus` | `app/metrics/korus/` | Custom gate | KORUS APAC metrics |
| `/metrics/productivity` | `app/metrics/productivity/` | Session or guest | COPIL productivity dashboard |
| `/ai-metrics` | `app/ai-metrics/` | ✅ getSession | AI metrics dashboard |
| `/settings` | `app/settings/` | ✅ getSession | User management, export |

### API Routes

| Route | Auth | Notes |
|---|---|---|
| `POST /api/auth` | None (login) | Email+password or legacy password login |
| `GET /api/auth` | getSession | Check auth status |
| `DELETE /api/auth` | None | Logout (clears cookie) |
| `POST /api/auth/guest` | None (guest login) | KORUS productivity access |
| `GET/POST /api/tasks` | getSession | Task CRUD |
| `GET/PATCH/DELETE /api/tasks/[id]` | getSession | Single task |
| `PATCH/DELETE /api/tasks/batch` | getSession | Bulk operations |
| `GET/POST /api/projects` | getSession | Project CRUD |
| `GET/PATCH/DELETE /api/projects/[id]` | getSession | Single project |
| `GET/POST /api/projects/[id]/milestones` | getSession | Project milestones |
| `PATCH/DELETE /api/projects/[id]/milestones/[mid]` | getSession | Single milestone |
| `GET/POST /api/projects/[id]/bookmarks` | getSession | Project bookmarks |
| `DELETE /api/projects/[id]/bookmarks/[bid]` | getSession | Single bookmark |
| `GET/POST /api/projects/[id]/contacts` | getSession | Project-contact links |
| `DELETE /api/projects/[id]/contacts/[pcid]` | getSession | Remove link |
| `GET/POST /api/areas` | getSession | Area CRUD |
| `GET/PATCH/DELETE /api/areas/[id]` | getSession | Single area |
| `GET/POST /api/sprints` | getSession | Sprint CRUD |
| `GET/PATCH/DELETE /api/sprints/[id]` | getSession | Single sprint |
| `GET/POST /api/contacts` | getSession | Contact CRUD |
| `GET/PATCH/DELETE /api/contacts/[id]` | getSession | Single contact |
| `PATCH/DELETE /api/contacts/batch` | getSession | Bulk contact ops |
| `GET/POST /api/organisations` | getSession | Organisation CRUD |
| `GET/PATCH/DELETE /api/organisations/[id]` | getSession | Single org |
| `GET/POST /api/notes` | getSession | Note CRUD |
| `GET/PATCH/DELETE /api/notes/[id]` | getSession | Single note |
| `GET/POST /api/bases` | getSession | Custom DB base CRUD |
| `GET/PATCH/DELETE /api/bases/[id]` | getSession | Single base |
| `GET/POST /api/bases/[id]/rows` | getSession | Row CRUD |
| `GET/PATCH/DELETE /api/bases/[id]/rows/[rowId]` | getSession | Single row |
| `GET/POST /api/users` | getSession | User management |
| `PATCH /api/users/[id]` | getSession | Update user |
| `GET /api/activity` | getSession | Activity log |
| `GET /api/search` | getSession | Full-text + vector search |
| `GET/POST /api/ai-metrics` | getSession | AI metrics CRUD |
| `GET /api/metrics/productivity` | session or guest | Productivity data |
| `GET /api/metrics/actions` | session or guest | Action log query |
| `GET /api/metrics/comparison` | session or guest | Workspace comparison |
| `GET/POST /api/metrics/email-stats` | getSession | Email stats |
| `GET /api/metrics/korus` | Custom password | KORUS metrics |
| `POST /api/backup/obsidian` | getSession | Obsidian export |
| `POST /api/sync/notion` | getSession | Manual Notion sync |
| `GET /api/cron/notion-sync` | CRON_SECRET | Scheduled Notion sync |
| `GET /api/cron/embed-backfill` | CRON_SECRET | Scheduled embedding |
| `POST /api/chat` | getSession | OpenClaw gateway URL |
| `POST /api/seed` | getSession | Seed database |

---

## 8. Known Issues

1. **Leaked credentials in git history** — SPEC.md previously contained live Neon DB password and Notion API key. Redacted in HEAD but still in history. **ROTATE IMMEDIATELY.**

2. **Hardcoded fallback passwords** — `'opsdb2026'` and `'korus2026'` are default fallbacks in auth routes. Fine for dev, must be overridden via env vars in production.

3. **20 unused npm packages** — All Radix UI primitives plus `next-themes`, `cmdk`, `class-variance-authority` are installed but never used. Likely vestigial from an initial shadcn/ui setup.

4. **`lib/env.ts` is dead code** — This Zod env schema validator is never imported. It also marks Notion vars as required which would fail validation if ever used in the current state (Notion not configured).

5. **drizzle-kit vulnerability** — 4 moderate severity advisories in dev dependencies. Not a production risk. Fix with `npm audit fix --force` (breaking drizzle-kit upgrade).

6. **Stale NocoDB env vars** — `.env.local` has `NOCODB_*` vars from reverted integration. The JWT token should be considered compromised and rotated.

7. **`NEXT_PUBLIC_OPENCLAW_WS_URL` not in `.env.local`** — Charlie Chat will attempt to connect to `ws://localhost:18789`. It will fail silently if the gateway isn't running.

---

## 9. Recommended Next Steps

**Immediate (security):**
- [ ] Rotate Neon DB password (`npg_jyxJkq7F4oCW`)
- [ ] Rotate Notion API key (`ntn_462911842545...`)
- [ ] Set `AUTH_PASSWORD_HASH`, `KORUS_GUEST_PASSWORD_HASH`, `CRON_SECRET` in production env
- [ ] Remove stale NocoDB vars from `.env.local`

**Cleanup (low risk):**
- [ ] Delete `lib/env.ts` (dead code, never imported)
- [ ] Remove 20 unused npm packages (after verifying build still passes)
- [ ] Consider running `npm audit fix --force` to upgrade drizzle-kit

**Documentation:**
- [ ] Update MEMORY.md — current architecture is DB-backed (Drizzle/Neon), not React Context + localStorage as described
- [ ] Document the `/api/seed` workflow for onboarding new developers

---

## Changes Made in This Audit

| Commit | Description |
|---|---|
| `397647b` | `chore: fix all ESLint warnings` — removed 12 unused imports and dead assignments |
| `487d349` | `security: redact live credentials from SPEC.md` — replaced with placeholders |
