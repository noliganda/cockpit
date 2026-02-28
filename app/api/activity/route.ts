import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { activityLog } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

    const conditions = [];
    if (workspaceId) conditions.push(eq(activityLog.workspaceId, workspaceId));
    if (entityType) conditions.push(eq(activityLog.entityType, entityType));
    if (entityId) conditions.push(eq(activityLog.entityId, entityId));

    const result = conditions.length > 0
      ? await db.select().from(activityLog)
          .where(and(...conditions))
          .orderBy(desc(activityLog.timestamp))
          .limit(limit)
      : await db.select().from(activityLog)
          .orderBy(desc(activityLog.timestamp))
          .limit(limit);

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
