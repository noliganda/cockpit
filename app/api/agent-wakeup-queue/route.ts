import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentWakeupRequests } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

/**
 * GET /api/agent-wakeup-queue?operatorId=devon
 * Returns queued wakeup requests for the given operator.
 */
export async function GET(request: NextRequest) {
  // Auth check
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Parse operatorId
  const { searchParams } = new URL(request.url)
  const operatorId = searchParams.get('operatorId')
  if (!operatorId) {
    return NextResponse.json({ error: 'Missing operatorId' }, { status: 400 })
  }
  try {
    const rows = await db
      .select()
      .from(agentWakeupRequests)
      .where(
        and(
          eq(agentWakeupRequests.operatorId, operatorId),
          eq(agentWakeupRequests.status, 'queued'),
        ),
      )
      .orderBy(agentWakeupRequests.requestedAt)
    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/agent-wakeup-queue]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
