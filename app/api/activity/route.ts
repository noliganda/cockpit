import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { activityLog } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

    const result = workspaceId
      ? await db
          .select()
          .from(activityLog)
          .where(eq(activityLog.workspaceId, workspaceId))
          .orderBy(desc(activityLog.timestamp))
          .limit(limit)
      : await db.select().from(activityLog).orderBy(desc(activityLog.timestamp)).limit(limit);

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
