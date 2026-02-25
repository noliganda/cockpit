-- Table: daily_metrics — Aggregated daily snapshots per workspace
CREATE TABLE IF NOT EXISTS daily_metrics (
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

CREATE INDEX IF NOT EXISTS idx_daily_metrics_workspace ON daily_metrics(workspace);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);
