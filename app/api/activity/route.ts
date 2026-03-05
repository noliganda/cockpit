import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activityLog } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace')
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)

    const rows = await db
      .select({
        id: activityLog.id,
        workspaceId: activityLog.workspaceId,
        actor: activityLog.actor,
        action: activityLog.action,
        entityType: activityLog.entityType,
        entityId: activityLog.entityId,
        entityTitle: activityLog.entityTitle,
        description: activityLog.description,
        metadata: activityLog.metadata,
        createdAt: activityLog.createdAt,
      })
      .from(activityLog)
      .where(workspaceId ? eq(activityLog.workspaceId, workspaceId) : undefined)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)

    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/activity]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
