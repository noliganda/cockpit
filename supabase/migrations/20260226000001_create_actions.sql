-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: actions — Every action logged across all workspaces
CREATE TABLE IF NOT EXISTS actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  workspace TEXT NOT NULL CHECK (workspace IN ('byron-film', 'korus', 'personal')),
  category TEXT NOT NULL CHECK (category IN (
    'email', 'research', 'admin', 'coordination', 'recruitment',
    'legal', 'creative', 'development', 'finance', 'translation',
    'sales', 'marketing', 'operations'
  )),
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

CREATE INDEX IF NOT EXISTS idx_actions_workspace ON actions(workspace);
CREATE INDEX IF NOT EXISTS idx_actions_category ON actions(category);
CREATE INDEX IF NOT EXISTS idx_actions_created_at ON actions(created_at);

-- Cosine similarity index for semantic search (IVFFlat)
-- Run AFTER populating with data: CREATE INDEX idx_actions_embedding ON actions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
