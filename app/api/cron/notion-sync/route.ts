import { NextRequest, NextResponse } from 'next/server';
import { syncAllWorkspaces } from '@/lib/notion-sync';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET ?? 'charlie-cron-2026';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await syncAllWorkspaces();
    const totals = results.reduce(
      (acc, r) => ({
        synced: acc.synced + r.synced,
        created: acc.created + r.created,
        updated: acc.updated + r.updated,
      }),
      { synced: 0, created: 0, updated: 0 }
    );

    return NextResponse.json({ data: { ...totals, workspaces: results } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
