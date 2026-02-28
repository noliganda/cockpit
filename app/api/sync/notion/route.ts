import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { isNotNull, desc } from 'drizzle-orm';
import { syncAllWorkspaces } from '@/lib/notion-sync';

export async function GET() {
  try {
    const lastSynced = await db
      .select({ notionLastSynced: tasks.notionLastSynced })
      .from(tasks)
      .where(isNotNull(tasks.notionLastSynced))
      .orderBy(desc(tasks.notionLastSynced))
      .limit(1);

    const syncedTaskCount = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(isNotNull(tasks.notionId));

    return NextResponse.json({
      data: {
        lastSynced: lastSynced[0]?.notionLastSynced ?? null,
        syncedTaskCount: syncedTaskCount.length,
        status: 'ready',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(_: NextRequest) {
  try {
    const results = await syncAllWorkspaces();
    const totals = results.reduce(
      (acc, r) => ({
        synced: acc.synced + r.synced,
        created: acc.created + r.created,
        updated: acc.updated + r.updated,
        errors: [...acc.errors, ...r.errors],
      }),
      { synced: 0, created: 0, updated: 0, errors: [] as string[] }
    );

    return NextResponse.json({ data: { ...totals, workspaces: results } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
