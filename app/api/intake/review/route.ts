import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activityLog } from '@/lib/db/schema'
import { eq, desc, and, or } from 'drizzle-orm'
import { getSession, getSessionData } from '@/lib/auth'
import { z } from 'zod'

/**
 * GET /api/intake/review
 *
 * Returns intake items that need review.
 * Queries activity_log for intake events with approvalStatus = 'pending'.
 *
 * Query params:
 * - status: 'pending' (default) | 'approved' | 'all'
 * - limit: number (default 100)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status') ?? 'pending'
    const limitParam = parseInt(searchParams.get('limit') ?? '100', 10)

    let whereClause
    if (statusParam === 'all') {
      whereClause = and(
        eq(activityLog.eventFamily, 'intake'),
        or(
          eq(activityLog.eventType, 'intake_needs_review'),
          eq(activityLog.eventType, 'intake_classified'),
        ),
        eq(activityLog.requiresApproval, true),
      )
    } else {
      whereClause = and(
        eq(activityLog.eventFamily, 'intake'),
        eq(activityLog.requiresApproval, true),
        eq(activityLog.approvalStatus, statusParam),
      )
    }

    const rows = await db
      .select({
        id: activityLog.id,
        workspaceId: activityLog.workspaceId,
        entityType: activityLog.entityType,
        entityId: activityLog.entityId,
        entityTitle: activityLog.entityTitle,
        description: activityLog.description,
        metadata: activityLog.metadata,
        eventType: activityLog.eventType,
        actorName: activityLog.actorName,
        sourceSystem: activityLog.sourceSystem,
        approvalStatus: activityLog.approvalStatus,
        approvedBy: activityLog.approvedBy,
        createdAt: activityLog.createdAt,
      })
      .from(activityLog)
      .where(whereClause)
      .orderBy(desc(activityLog.createdAt))
      .limit(limitParam)

    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/intake/review]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/intake/review
 *
 * Mark an intake review item as approved/reviewed.
 * Body: { id: string, approvalStatus: 'approved' | 'rejected' }
 */
const patchSchema = z.object({
  id: z.string().uuid(),
  approvalStatus: z.enum(['approved', 'rejected']),
})

export async function PATCH(request: NextRequest) {
  try {
    const sessionData = await getSessionData()
    if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (sessionData.role === 'guest') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as unknown
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const { id, approvalStatus } = parsed.data

    const [updated] = await db
      .update(activityLog)
      .set({
        approvalStatus,
        approvedBy: sessionData.email,
      })
      .where(eq(activityLog.id, id))
      .returning({ id: activityLog.id, approvalStatus: activityLog.approvalStatus })

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/intake/review]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
