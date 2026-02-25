import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const WORKSPACES = ['byron-film', 'korus', 'personal'] as const;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const date: string = body.date ?? new Date().toISOString().split('T')[0];

  const supabase = createServerClient();
  const results: Record<string, unknown> = {};

  for (const workspace of WORKSPACES) {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { data: actions, error } = await supabase
      .from('actions')
      .select('*')
      .eq('workspace', workspace)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (error || !actions) {
      results[workspace] = { error: error?.message ?? 'no data' };
      continue;
    }

    const tasks_completed = actions.length;
    const tasks_by_category: Record<string, number> = {};
    let total_duration_minutes = 0;
    let api_tokens_total = 0;
    let api_cost_total_usd = 0;
    let human_interventions = 0;
    let emails_sent = 0;
    let emails_received = 0;

    for (const action of actions) {
      tasks_by_category[action.category] =
        (tasks_by_category[action.category] ?? 0) + 1;
      total_duration_minutes += action.duration_minutes ?? 0;
      api_tokens_total += action.api_tokens_used ?? 0;
      api_cost_total_usd += parseFloat(action.api_cost_usd) || 0;
      if (action.human_intervention) human_interventions++;
      if (action.category === 'email') {
        const meta = action.metadata as Record<string, unknown>;
        if (meta?.direction === 'sent') emails_sent++;
        else emails_received++;
      }
    }

    const avg_duration_minutes =
      tasks_completed > 0 ? total_duration_minutes / tasks_completed : 0;
    const automation_rate =
      tasks_completed > 0
        ? Math.round(
            ((tasks_completed - human_interventions) / tasks_completed) * 100
          )
        : 100;

    const snapshot = {
      date,
      workspace,
      tasks_completed,
      tasks_by_category,
      total_duration_minutes,
      avg_duration_minutes: Math.round(avg_duration_minutes * 100) / 100,
      api_tokens_total,
      api_cost_total_usd: Math.round(api_cost_total_usd * 10000) / 10000,
      human_interventions,
      automation_rate,
      emails_sent,
      emails_received,
    };

    const { data: upserted, error: upsertError } = await supabase
      .from('daily_metrics')
      .upsert(snapshot, { onConflict: 'date,workspace' })
      .select()
      .single();

    results[workspace] = upsertError
      ? { error: upsertError.message }
      : upserted;
  }

  return NextResponse.json({ date, results });
}
