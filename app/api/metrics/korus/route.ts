import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ── types ──────────────────────────────────────────────────────────────────

type ActionRow = {
  id: string;
  created_at: string;
  workspace: string;
  category: string;
  description: string;
  outcome?: string;
  duration_minutes?: number;
  human_intervention: boolean;
  intervention_type?: string;
  api_cost_usd?: number | string;
  api_tokens_used?: number;
  metadata?: Record<string, unknown>;
};

function safeFloat(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
  return isNaN(n) ? 0 : n;
}

function computeStats(actions: ActionRow[]) {
  const total = actions.length;
  if (total === 0) {
    return {
      total_actions: 0,
      automation_rate: 100,
      human_intervention_rate: 0,
      avg_duration_minutes: 0,
      total_cost_usd: 0,
      avg_cost_per_task: 0,
      category_breakdown: {} as Record<string, number>,
      top_category: null as string | null,
      days_active: 0,
    };
  }

  const human = actions.filter((a) => a.human_intervention).length;
  const automation_rate = Math.round(((total - human) / total) * 100);
  const human_intervention_rate = Math.round((human / total) * 100);
  const total_dur = actions.reduce((s, a) => s + (a.duration_minutes ?? 0), 0);
  const avg_duration_minutes = Math.round((total_dur / total) * 10) / 10;
  const total_cost_usd = Math.round(
    actions.reduce((s, a) => s + safeFloat(a.api_cost_usd), 0) * 10000
  ) / 10000;
  const avg_cost_per_task = total > 0 ? Math.round((total_cost_usd / total) * 100000) / 100000 : 0;

  const category_breakdown: Record<string, number> = {};
  for (const a of actions) {
    category_breakdown[a.category] = (category_breakdown[a.category] ?? 0) + 1;
  }

  const top_category =
    Object.entries(category_breakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const days_active = new Set(actions.map((a) => a.created_at.substring(0, 10))).size;

  return {
    total_actions: total,
    automation_rate,
    human_intervention_rate,
    avg_duration_minutes,
    total_cost_usd,
    avg_cost_per_task,
    category_breakdown,
    top_category,
    days_active,
  };
}

export async function GET() {
  try {
    const supabase = createServerClient();

    // Pull all korus actions (no date limit — we filter in JS for flexibility)
    const { data: korusRaw, error: korusErr } = await supabase
      .from('actions')
      .select('*')
      .eq('workspace', 'korus')
      .order('created_at', { ascending: false });

    if (korusErr) {
      return NextResponse.json({ error: korusErr.message }, { status: 500 });
    }

    const korusActions: ActionRow[] = korusRaw ?? [];

    // Byron Film (last 90 days for comparison)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: byronRaw } = await supabase
      .from('actions')
      .select('*')
      .eq('workspace', 'byron-film')
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: false });

    const byronActions: ActionRow[] = byronRaw ?? [];

    // ── Date windows ───────────────────────────────────────────────────────
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const thisMonthActions = korusActions.filter(
      (a) => new Date(a.created_at) >= startOfMonth
    );
    const last30KorusActions = korusActions.filter(
      (a) => new Date(a.created_at) >= thirtyDaysAgo
    );

    // ── Summary (this month) ───────────────────────────────────────────────
    const monthStats = computeStats(thisMonthActions);

    // ── Daily volume (last 30 days, stacked by category) ──────────────────
    const dailyMap: Record<string, Record<string, number>> = {};
    for (const action of last30KorusActions) {
      const date = action.created_at.substring(0, 10);
      if (!dailyMap[date]) dailyMap[date] = {};
      dailyMap[date][action.category] = (dailyMap[date][action.category] ?? 0) + 1;
    }
    const daily_volume = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cats]) => {
        const total = Object.values(cats).reduce((s, v) => s + v, 0);
        return { date: date.substring(5), ...cats, total };
      });

    // ── Category breakdown (this month) ───────────────────────────────────
    const catDuration: Record<string, number[]> = {};
    for (const a of thisMonthActions) {
      if (a.duration_minutes) {
        catDuration[a.category] = catDuration[a.category] ?? [];
        catDuration[a.category].push(a.duration_minutes);
      }
    }
    const category_breakdown = Object.entries(monthStats.category_breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => {
        const durations = catDuration[category] ?? [];
        const avg_duration =
          durations.length > 0
            ? Math.round((durations.reduce((s, v) => s + v, 0) / durations.length) * 10) / 10
            : 0;
        return { category, count, avg_duration };
      });

    // ── Daily cost trend (last 30 days) ───────────────────────────────────
    const costMap: Record<string, number> = {};
    for (const a of last30KorusActions) {
      const date = a.created_at.substring(0, 10);
      costMap[date] = (costMap[date] ?? 0) + safeFloat(a.api_cost_usd);
    }
    const daily_cost = Object.entries(costMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({
        date: date.substring(5),
        cost: Math.round(cost * 10000) / 10000,
      }));

    // ── Intervention type breakdown ────────────────────────────────────────
    const interventionTypes: Record<string, number> = {};
    for (const a of thisMonthActions) {
      if (a.human_intervention && a.intervention_type) {
        interventionTypes[a.intervention_type] =
          (interventionTypes[a.intervention_type] ?? 0) + 1;
      }
    }

    // ── Recent actions (last 20) ───────────────────────────────────────────
    const recent_actions = korusActions.slice(0, 20).map((a) => ({
      id: a.id,
      created_at: a.created_at,
      category: a.category,
      description: a.description,
      outcome: a.outcome,
      duration_minutes: a.duration_minutes,
      human_intervention: a.human_intervention,
    }));

    // ── Last updated ───────────────────────────────────────────────────────
    const last_updated = korusActions[0]?.created_at ?? null;

    // ── Comparison stats (last 90 days) ────────────────────────────────────
    const last90KorusActions = korusActions.filter(
      (a) => new Date(a.created_at) >= new Date(ninetyDaysAgo)
    );

    const comparison = {
      korus: computeStats(last90KorusActions),
      'byron-film': computeStats(byronActions),
    };

    return NextResponse.json({
      last_updated,
      summary: {
        total_actions: monthStats.total_actions,
        automation_rate: monthStats.automation_rate,
        avg_duration_minutes: monthStats.avg_duration_minutes,
        human_intervention_rate: monthStats.human_intervention_rate,
        total_cost_usd: monthStats.total_cost_usd,
      },
      daily_volume,
      category_breakdown,
      daily_cost,
      intervention_types: interventionTypes,
      recent_actions,
      comparison,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
