import { createClient } from '@supabase/supabase-js';

// Lazy browser client — created on first use so missing env vars don't crash at build time
let _client: ReturnType<typeof createClient> | null = null;
export function getSupabaseClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
    _client = createClient(url, key);
  }
  return _client;
}

// Server client (service role key — full access, server-side only)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  return createClient(url, key);
}

// Convenience re-export for browser usage
export const supabase = { get: getSupabaseClient };

export type Action = {
  id: string;
  created_at: string;
  workspace: 'byron-film' | 'korus' | 'personal';
  category:
    | 'email'
    | 'research'
    | 'admin'
    | 'coordination'
    | 'recruitment'
    | 'legal'
    | 'creative'
    | 'development'
    | 'finance'
    | 'translation'
    | 'sales'
    | 'marketing'
    | 'operations';
  description: string;
  outcome?: string;
  duration_minutes?: number;
  tools_used?: string[];
  human_intervention: boolean;
  intervention_type?: string;
  api_tokens_used?: number;
  api_cost_usd?: number;
  metadata: Record<string, unknown>;
  embedding?: number[];
};

export type DailyMetrics = {
  id: string;
  date: string;
  workspace: string;
  tasks_completed: number;
  tasks_by_category: Record<string, number>;
  total_duration_minutes: number;
  avg_duration_minutes: number;
  api_tokens_total: number;
  api_cost_total_usd: number;
  human_interventions: number;
  automation_rate: number;
  emails_sent: number;
  emails_received: number;
};

export type KorusMetric = {
  id: string;
  created_at: string;
  metric_type: string;
  metric_key: string;
  metric_value: unknown;
  updated_at: string;
};
