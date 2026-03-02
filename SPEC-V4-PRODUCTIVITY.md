# OPS Dashboard v4 — Productivity Comparison Dashboard

## Context
The dashboard (v4) already uses Neon + Drizzle ORM. Tasks sync from Notion. The `ai_metrics` table exists but is empty and missing a `workspace` field. We need to build a **cross-workspace productivity comparison page** that measures AI-assisted operations for a board presentation (COPIL).

The original email to the board (Feb 12, 2026) promised these KPIs:
- Task volume by type + time per task
- Automation rate (% manual steps replaced)
- Cost efficiency (API cost vs hours saved)
- Email volume + response times
- Human intervention rate + error types
- Security incidents
- Before/after comparison

## What Exists
- **Database:** Neon (Postgres + pgvector), Sydney region, connected via `@neondatabase/serverless` + Drizzle
- **Schema:** `lib/db/schema.ts` — tasks, projects, areas, contacts, sprints, aiMetrics, activityLog, etc.
- **`ai_metrics` table:** Has period, task counts, automation rate, API cost, emails, intervention rate — but NO workspace field, NO baseline comparison data, and 0 rows
- **`activity_log` table:** 73 rows of sync/user actions with workspace_id
- **Current `/metrics/korus` page:** Shows KORUS task counts, project/contact stats, activity chart — but NOT the productivity metrics promised to Bruno
- **Supabase `actions` table:** 25 rows of detailed per-action metrics (category, duration, human_intervention, api_cost, tokens) — this data needs migrating

## What to Build

### 1. Schema Changes

#### Extend `ai_metrics` table — add workspace field
```sql
ALTER TABLE ai_metrics ADD COLUMN workspace TEXT NOT NULL DEFAULT 'all';
```

#### New `actions` table (migrate from Supabase)
This is the granular per-action log that feeds the metrics:
```sql
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  workspace TEXT NOT NULL, -- 'korus' | 'byron-film' | 'personal'
  category TEXT NOT NULL, -- 'email' | 'research' | 'admin' | 'coordination' | 'recruitment' | 'legal' | 'creative' | 'development' | 'finance' | 'translation' | 'sales' | 'marketing' | 'operations'
  description TEXT NOT NULL,
  outcome TEXT,
  duration_minutes REAL,
  estimated_manual_minutes REAL, -- how long this would take manually
  human_intervention BOOLEAN NOT NULL DEFAULT false,
  intervention_type TEXT, -- 'tone' | 'content' | 'timing' | 'recipient' | 'other'
  api_cost_usd REAL DEFAULT 0,
  api_tokens_used INTEGER DEFAULT 0,
  api_model TEXT,
  metadata JSONB
);
CREATE INDEX actions_workspace_idx ON actions(workspace);
CREATE INDEX actions_created_idx ON actions(created_at);
```

#### New `baselines` table
```sql
CREATE TABLE baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  workspace TEXT NOT NULL,
  estimated_manual_minutes REAL NOT NULL,
  hourly_rate_usd REAL NOT NULL DEFAULT 75,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, workspace)
);
```

#### New `email_stats` table
```sql
CREATE TABLE email_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  workspace TEXT NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_received INTEGER DEFAULT 0,
  avg_response_time_minutes REAL,
  autonomous_responses INTEGER DEFAULT 0,
  escalated INTEGER DEFAULT 0,
  UNIQUE(date, workspace)
);
```

Add these to `lib/db/schema.ts` using Drizzle syntax matching existing patterns.

### 2. API Routes

#### `GET /api/metrics/productivity`
Returns aggregated productivity metrics, filterable by workspace + date range.
- Total tasks, hours saved, automation rate, ROI per workspace
- Category breakdown
- Time series data for charts

#### `POST /api/metrics/actions`
Log a new action (used by Charlie/cron to record work done).

#### `GET /api/metrics/comparison`
Side-by-side workspace comparison data:
- Byron Film (full programmatic access) vs KORUS (limited access)
- Key delta metrics

#### `GET /api/metrics/email-stats`
Email volume and response time data per workspace.

### 3. Frontend — New Page `/metrics/productivity`

Replace or extend the current `/metrics/korus` page. Keep guest auth (password: korus-guest).

#### Section 1: Overview Cards (top row)
- Total tasks completed (all time + this week) per workspace
- Hours saved (cumulative) = Σ(estimated_manual_minutes - duration_minutes)
- Automation rate (% no human intervention)
- Net ROI = (hours_saved × hourly_rate) - api_costs
- Color-coded by workspace: 🔵 #3B82F6 Byron Film | 🟢 #10B981 Personal | 🟠 #F97316 KORUS

#### Section 2: Volume & Throughput
- Bar chart: tasks per week, stacked by workspace
- Category breakdown (email, research, admin, etc.)
- Trend line

#### Section 3: Time Savings
- Side-by-side: AI duration vs estimated manual duration
- Cumulative hours saved (line chart)
- Per-category breakdown
- Byron Film vs KORUS delta highlighted

#### Section 4: Automation Rate & Quality
- % fully autonomous by workspace (trend)
- Human intervention rate with error type pie chart
- Target line at 5%

#### Section 5: Cost Efficiency / ROI
- Weekly API cost (bar)
- Cost per task by category
- ROI calculation with break-even line
- API cost vs equivalent FTE

#### Section 6: Email Operations
- Emails per week by workspace
- Response time
- Autonomous vs escalated
- Byron Film (Gmail access) vs KORUS (no access) comparison

#### Section 7: Access Level Comparison (hero section)
Three columns showing what's possible with each access level:
- Byron Film: Full (Gmail, Notion, CRM, Xero, Drive)
- Personal: Full (Gmail, Calendar, Drive)
- KORUS: Limited (no Gmail, no direct systems)
- Multiplier metric per workspace

### 4. Data Migration
- Export 25 rows from Supabase `actions` table
- Insert into new Neon `actions` table
- The migration data is at: query Supabase at `https://zukitnqlhwuwdegheabz.supabase.co` with the service role key in `.env.local`

### 5. Cleanup
- Remove Supabase migration files (`supabase/migrations/`)
- Remove `lib/supabase.ts` if it still exists
- Remove Supabase env vars from `.env.local` after confirming migration
- Remove `@supabase/supabase-js` from package.json if still present

## Design Notes
- Match existing dark theme (#0F0F0F bg, #F5F5F5 text)
- Use Recharts (already installed)
- Workspace colors: 🔵 #3B82F6 Byron Film | 🟢 #10B981 Personal | 🟠 #F97316 KORUS
- Mobile responsive
- Loading states with skeletons (match existing patterns)
- Use server components where possible (match existing page patterns like `/metrics/korus/page.tsx`)

## Important
- Do NOT modify existing working pages (tasks, projects, CRM, etc.)
- Do NOT break the Notion sync
- Do NOT remove the existing `/metrics/korus` page — redirect it to `/metrics/productivity` or keep it as a sub-view
- Run `npm run db:push` after schema changes to sync with Neon
- Test with `npm run dev` before committing

## Environment
- `DATABASE_URL` is set in `.env.local` and Vercel env vars
- Node.js, Next.js 16, React 19, Tailwind 4, Recharts
- Git: commit to main, Vercel auto-deploys
