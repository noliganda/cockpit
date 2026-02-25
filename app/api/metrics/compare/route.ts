import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

async function getWorkspaceStats(
  workspace: string,
  from?: string | null,
  to?: string | null
) {
  const supabase = createServerClient();
  let query = supabase.from('actions').select('*').eq('workspace', workspace);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data: actions, error } = await query;
  if (error || !actions) return null;

  const total_actions = actions.length;
  const total_duration_minutes = actions.reduce(
    (sum, a) => sum + (a.duration_minutes ?? 0),
    0
  );
  const avg_duration_minutes =
    total_actions > 0 ? total_duration_minutes / total_actions : 0;
  const total_api_cost_usd = actions.reduce(
    (sum, a) => sum + (parseFloat(a.api_cost_usd) || 0),
    0
  );
  const total_api_tokens = actions.reduce(
    (sum, a) => sum + (a.api_tokens_used ?? 0),
    0
  );
  const human_interventions = actions.filter((a) => a.human_intervention).length;
  const automation_rate =
    total_actions > 0
      ? Math.round(((total_actions - human_interventions) / total_actions) * 100)
      : 100;

  const category_breakdown: Record<string, number> = {};
  for (const action of actions) {
    category_breakdown[action.category] =
      (category_breakdown[action.category] ?? 0) + 1;
  }

  const top_category =
    Object.entries(category_breakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    null;

  return {
    workspace,
    total_actions,
    total_duration_minutes,
    avg_duration_minutes: Math.round(avg_duration_minutes * 100) / 100,
    total_api_cost_usd: Math.round(total_api_cost_usd * 10000) / 10000,
    total_api_tokens,
    human_interventions,
    automation_rate,
    category_breakdown,
    top_category,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const [byronStats, korusStats, personalStats] = await Promise.all([
    getWorkspaceStats('byron-film', from, to),
    getWorkspaceStats('korus', from, to),
    getWorkspaceStats('personal', from, to),
  ]);

  return NextResponse.json({
    workspaces: {
      'byron-film': byronStats,
      korus: korusStats,
      personal: personalStats,
    },
    generated_at: new Date().toISOString(),
  });
}
