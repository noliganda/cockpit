import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspace = searchParams.get('workspace');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const supabase = createServerClient();
  let query = supabase.from('actions').select('*');

  if (workspace) query = query.eq('workspace', workspace);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data: actions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!actions || actions.length === 0) {
    return NextResponse.json({
      total_actions: 0,
      total_duration_minutes: 0,
      avg_duration_minutes: 0,
      total_api_cost_usd: 0,
      total_api_tokens: 0,
      human_interventions: 0,
      automation_rate: 100,
      category_breakdown: {},
      workspace_breakdown: {},
      recent_actions: [],
    });
  }

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

  // Category breakdown
  const category_breakdown: Record<string, number> = {};
  for (const action of actions) {
    category_breakdown[action.category] =
      (category_breakdown[action.category] ?? 0) + 1;
  }

  // Workspace breakdown
  const workspace_breakdown: Record<string, number> = {};
  for (const action of actions) {
    workspace_breakdown[action.workspace] =
      (workspace_breakdown[action.workspace] ?? 0) + 1;
  }

  return NextResponse.json({
    total_actions,
    total_duration_minutes,
    avg_duration_minutes: Math.round(avg_duration_minutes * 100) / 100,
    total_api_cost_usd: Math.round(total_api_cost_usd * 10000) / 10000,
    total_api_tokens,
    human_interventions,
    automation_rate,
    category_breakdown,
    workspace_breakdown,
    recent_actions: actions.slice(0, 10),
  });
}
