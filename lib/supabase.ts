import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser client (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client (service role key — full access, server-side only)
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

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
