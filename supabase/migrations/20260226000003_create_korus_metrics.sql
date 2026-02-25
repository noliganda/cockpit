-- Table: korus_metrics — Replaces static korus-metrics-data.ts
CREATE TABLE IF NOT EXISTS korus_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  metric_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_korus_metrics_type ON korus_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_korus_metrics_key ON korus_metrics(metric_key);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER korus_metrics_updated_at
  BEFORE UPDATE ON korus_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
