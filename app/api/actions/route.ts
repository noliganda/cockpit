import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    workspace,
    category,
    description,
    outcome,
    duration_minutes,
    tools_used,
    human_intervention,
    intervention_type,
    api_tokens_used,
    api_cost_usd,
    metadata,
  } = body;

  if (!workspace || !category || !description) {
    return NextResponse.json(
      { error: 'workspace, category, and description are required' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('actions')
    .insert({
      workspace,
      category,
      description,
      outcome,
      duration_minutes,
      tools_used,
      human_intervention: human_intervention ?? false,
      intervention_type,
      api_tokens_used,
      api_cost_usd,
      metadata: metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspace = searchParams.get('workspace');
  const category = searchParams.get('category');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const supabase = createServerClient();
  let query = supabase
    .from('actions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (workspace) query = query.eq('workspace', workspace);
  if (category) query = query.eq('category', category);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, limit, offset });
}
