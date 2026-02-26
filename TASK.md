# Task: Supabase Backend — Phase 1 (Action Logging + pgvector)

## Context
This is an Ops Dashboard (Next.js 15 / App Router) for tracking work across 3 workspaces:
- Byron Film (video production) — accent: #C8FF3D
- KORUS Group (construction fit-out) — accent: #3B82F6  
- Personal — accent: #F97316

Currently uses localStorage for all data. We're adding Supabase as the backend.
The immediate priority is an **action logging system** that tracks every task/action performed, plus **pgvector** for semantic search.

## What to Build

### 1. Supabase Setup
- Create `lib/supabase.ts` — client + server helpers
- Use env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- For now, use the service role key for server-side operations (we'll add RLS later)

### 2. Database Schema (create as SQL migration files in `supabase/migrations/`)

**Table: `actions`** — Every action logged across all workspaces
```sql
CREATE TABLE actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  workspace TEXT NOT NULL CHECK (workspace IN ('byron-film', 'korus', 'personal')),
  category TEXT NOT NULL CHECK (category IN ('email', 'research', 'admin', 'coordination', 'recruitment', 'legal', 'creative', 'development', 'finance', 'translation', 'sales', 'marketing', 'operations')),
  description TEXT NOT NULL,
  outcome TEXT,
  duration_minutes INTEGER,
  tools_used TEXT[],
  human_intervention BOOLEAN DEFAULT false,
  intervention_type TEXT,
  api_tokens_used INTEGER,
  api_cost_usd NUMERIC(10,4),
  metadata JSONB DEFAULT '{}',
  embedding vector(1536)
);

CREATE INDEX idx_actions_workspace ON actions(workspace);
CREATE INDEX idx_actions_category ON actions(category);
CREATE INDEX idx_actions_created_at ON actions(created_at);
```

**Table: `daily_metrics`** — Aggregated daily snapshots
```sql
CREATE TABLE daily_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  workspace TEXT NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  tasks_by_category JSONB DEFAULT '{}',
  total_duration_minutes INTEGER DEFAULT 0,
  avg_duration_minutes NUMERIC(10,2),
  api_tokens_total INTEGER DEFAULT 0,
  api_cost_total_usd NUMERIC(10,4) DEFAULT 0,
  human_interventions INTEGER DEFAULT 0,
  automation_rate NUMERIC(5,2),
  emails_sent INTEGER DEFAULT 0,
  emails_received INTEGER DEFAULT 0,
  UNIQUE(date, workspace)
);
```

**Table: `korus_metrics`** — Replace the static TypeScript file
```sql
CREATE TABLE korus_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  metric_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. API Routes

**`POST /api/actions`** — Log a new action
- Body: { workspace, category, description, outcome?, duration_minutes?, tools_used?, human_intervention?, api_tokens_used?, api_cost_usd?, metadata? }
- Returns the created action

**`GET /api/actions`** — Query actions  
- Query params: workspace, category, from, to, limit, offset
- Returns paginated actions

**`GET /api/metrics`** — Get aggregated metrics
- Query params: workspace, from, to
- Returns: task counts, duration stats, category breakdown, cost totals, automation rate
- Should aggregate from `actions` table on the fly

**`GET /api/metrics/compare`** — Comparative metrics (Byron Film vs KORUS)
- Returns side-by-side stats for both workspaces
- This is the key endpoint for Bruno's dashboard

**`POST /api/metrics/daily-snapshot`** — Generate daily rollup
- Aggregates today's actions into daily_metrics table

### 4. Update Metrics Page (`app/metrics/page.tsx`)
- Pull real data from `/api/metrics` instead of stores
- Show workspace comparison cards
- Keep the existing layout/style but wire to real data

### 5. Update KORUS Metrics Page (`app/metrics/korus/page.tsx`)
- Replace static `korus-metrics-data.ts` with data from Supabase
- Keep the guest auth (password: korus-guest)
- Add a live activity feed from the `actions` table filtered to workspace='korus'
- Keep existing layout but wire to real data

### 6. Install Dependencies
```bash
npm install @supabase/supabase-js
```

## Design Rules
- Dark theme: bg #0F0F0F, cards #1A1A1A, borders #2A2A2A
- Use workspace accent colors from `getWorkspaceColor()`
- Match existing component patterns (see any page for reference)
- Tailwind CSS only, no external UI libraries beyond what's installed

## Important
- Do NOT delete any existing pages or components
- Do NOT modify the auth system
- Do NOT touch localStorage stores — they stay for now, Supabase runs alongside
- The migration files should be runnable SQL (we'll run them manually in Supabase SQL editor)
- Keep the existing guest auth on /metrics/korus (password: korus-guest)

## Git
- Commit after each major piece (schema, API routes, pages)
- Use conventional commits: feat:, fix:, etc.
- Author: hey@oliviermarcolin.com / Charlie

When completely finished, run this command to notify me:
openclaw system event --text "Done: Supabase backend Phase 1 — action logging, pgvector schema, metrics API routes, live metrics pages" --mode now
