# Environment Variable Audit

Generated: 2026-03-03

## Summary

The app has 15 distinct `process.env.*` references across 14 source files. Not all of them are strictly required — some are optional with fallbacks; some belong to optional integrations.

---

## Variable Catalogue

### `DATABASE_URL`
- **File:** `lib/db/index.ts`
- **What it does:** Primary Neon PostgreSQL connection string (pooled) used by Drizzle ORM for all DB queries.
- **Required:** YES — the app will crash on startup without this.
- **Current .env.local value:** Set ✓

---

### `DATABASE_URL_UNPOOLED`
- **File:** `drizzle.config.ts`
- **What it does:** Direct (non-pooled) Neon connection for `drizzle-kit push` / `drizzle-kit studio` CLI commands. Not used at runtime.
- **Required:** NO at runtime. Required only when running `npm run db:push` or `npm run db:studio`.
- **Current .env.local value:** Not set (not needed for running the app).

---

### `AUTH_PASSWORD_HASH`
- **File:** `app/api/auth/route.ts`
- **What it does:** bcrypt hash of the legacy single-password auth (the "password only" login mode). If absent, defaults to a hardcoded hash of `'opsdb2026'`.
- **Required:** NO — falls back to `'opsdb2026'`. Set this in production to override the default.
- **Current .env.local value:** Not set (using default fallback).

---

### `KORUS_GUEST_PASSWORD_HASH`
- **File:** `app/api/auth/guest/route.ts`
- **What it does:** bcrypt hash of the KORUS guest access password for `/metrics/productivity`. If absent, falls back to hardcoded `'korus2026'`.
- **Required:** NO — falls back to `'korus2026'`. **SECURITY: Set this in production** to avoid the hardcoded plaintext fallback.
- **Current .env.local value:** Not set (using hardcoded fallback — see security notes).

---

### `CRON_SECRET`
- **Files:** `app/api/cron/embed-backfill/route.ts`, `app/api/cron/notion-sync/route.ts`
- **What it does:** Bearer token to authenticate cron job requests to `/api/cron/*` endpoints.
- **Required:** NO — defaults to `'charlie-cron-2026'` (see `lib/env.ts`). Set in production to a strong secret.
- **Current .env.local value:** Not set (using default).

---

### `OPENAI_API_KEY`
- **Files:** `lib/embeddings.ts`, `lib/search.ts`, `lib/activity.ts`, `app/api/cron/embed-backfill/route.ts`
- **What it does:** OpenAI API key for generating vector embeddings of activity log entries and powering semantic search.
- **Required:** NO — all embedding/search paths are gated with `if (process.env.OPENAI_API_KEY)`. Without it, semantic search and embeddings are silently skipped.
- **Current .env.local value:** Not set (embeddings/semantic search disabled).

---

### `NOTION_API_KEY`
- **File:** `lib/notion-sync.ts`
- **What it does:** Notion integration token for syncing tasks from Notion databases.
- **Required:** NO — only used by the `/api/sync/notion` and `/api/cron/notion-sync` routes. Without it, Notion sync will fail with an auth error at runtime if triggered.
- **Current .env.local value:** Not set.

---

### `NOTION_BF_TASKS_DB`
- **File:** `lib/notion-sync.ts`
- **What it does:** Notion database ID for Byron Film tasks.
- **Required:** NO — only used if Notion sync is triggered.
- **Current .env.local value:** Not set.

---

### `NOTION_KORUS_TASKS_DB`
- **File:** `lib/notion-sync.ts`
- **What it does:** Notion database ID for KORUS tasks.
- **Required:** NO — only used if Notion sync is triggered.
- **Current .env.local value:** Not set.

---

### `NOTION_OC_TASKS_DB`
- **File:** `lib/notion-sync.ts`
- **What it does:** Notion database ID for Personal (OC) tasks.
- **Required:** NO — only used if Notion sync is triggered.
- **Current .env.local value:** Not set.

---

### `OPENCLAW_GATEWAY_URL`
- **Files:** `app/api/chat/route.ts`, `components/charlie-chat.tsx` (via `NEXT_PUBLIC_OPENCLAW_WS_URL`)
- **What it does:** Server-side WebSocket URL for the OpenClaw AI gateway used by the Charlie Chat feature.
- **Required:** NO — defaults to `ws://localhost:18789`. The chat feature will fail silently if the gateway isn't running.
- **Current .env.local value:** Not set (uses default).

---

### `OPENCLAW_GATEWAY_TOKEN`
- **File:** `app/api/chat/route.ts`
- **What it does:** Auth token sent to the OpenClaw gateway WebSocket connection.
- **Required:** NO — can be undefined; gateway must be configured to accept unauthenticated connections if absent.
- **Current .env.local value:** Not set.

---

### `NEXT_PUBLIC_OPENCLAW_WS_URL`
- **File:** `components/charlie-chat.tsx`
- **What it does:** Client-side (browser) WebSocket URL for direct WS connection in the CharlieChat widget. Public var — exposed to the browser.
- **Required:** NO — defaults to `ws://localhost:18789`.
- **Current .env.local value:** Not set (uses default).

---

### `NODE_ENV`
- **File:** `lib/auth.ts`
- **What it does:** Standard Node.js env var. Used to set `secure: true` on session cookies in production.
- **Required:** Automatically set by Next.js runtime. Not configurable via .env.local.

---

### `HOME`
- **File:** `lib/obsidian-export.ts`
- **What it does:** OS home directory path used to locate the Obsidian vault for the backup export feature.
- **Required:** NO — falls back to `'~'`. Automatically set by the OS.

---

## Stale Variables in `.env.local`

The following variables are present in `.env.local` but **not referenced anywhere in the current source code**. They are leftovers from the reverted NocoDB integration:

| Variable | Status |
|---|---|
| `NOCODB_URL` | Stale — NocoDB integration reverted |
| `NEXT_PUBLIC_NOCODB_URL` | Stale — NocoDB integration reverted |
| `NOCODB_API_TOKEN` | Stale — NocoDB integration reverted |

**Recommendation:** Remove these three lines from `.env.local` to keep it clean. The token in `NOCODB_API_TOKEN` is a JWT that should be considered rotated.

---

## Minimum Required `.env.local` for Production

```env
# Required — app will not start without this
DATABASE_URL=postgresql://...

# Strongly recommended
AUTH_PASSWORD_HASH=<bcrypt hash of your admin password>
KORUS_GUEST_PASSWORD_HASH=<bcrypt hash of KORUS guest password>
CRON_SECRET=<strong random secret>

# Optional — enables Notion sync
NOTION_API_KEY=<notion integration token>
NOTION_BF_TASKS_DB=<database id>
NOTION_KORUS_TASKS_DB=<database id>
NOTION_OC_TASKS_DB=<database id>

# Optional — enables AI embeddings + semantic search
OPENAI_API_KEY=<openai key>

# Optional — enables Charlie Chat widget
OPENCLAW_GATEWAY_URL=wss://...
OPENCLAW_GATEWAY_TOKEN=<token>
NEXT_PUBLIC_OPENCLAW_WS_URL=wss://...
```
