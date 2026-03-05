import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activityLog, tasks } from '@/lib/db/schema'
import { eq, count, desc } from 'drizzle-orm'
import { getSession, getGuestSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    const guestSession = await getGuestSession()
    if (!session && !guestSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [taskStats, recentActivity, allTasks] = await Promise.all([
      db.select({ count: count() }).from(tasks).where(eq(tasks.workspaceId, 'korus')),
      db.select().from(activityLog)
        .where(eq(activityLog.workspaceId, 'korus'))
        .orderBy(desc(activityLog.createdAt))
        .limit(20),
      db.select().from(tasks).where(eq(tasks.workspaceId, 'korus')),
    ])

    const completedTasks = allTasks.filter(t => ['Won', 'Delivered', 'Completed'].includes(t.status)).length
    const activeCandidates = allTasks.filter(t => t.tags?.includes('recruitment')).length

    return NextResponse.json({
      stats: {
        totalTasks: taskStats[0]?.count ?? 0,
        completedTasks,
        activeCandidates,
        recentActivityCount: recentActivity.length,
      },
      recentActivity,
      allTasks,
    })
  } catch (error) {
    console.error('[GET /api/metrics/korus]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
