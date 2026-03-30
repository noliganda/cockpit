import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentTaskSessions, tasks } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/agent-queue?operatorId=...
 * Returns queued agent task sessions with task context.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const operatorId = url.searchParams.get('operatorId')
    if (!operatorId) {
      return NextResponse.json({ error: 'Missing operatorId' }, { status: 400 })
    }

    // Fetch queued sessions and join task info
    const sessions = await db
      .select({
        sessionId: agentTaskSessions.id,
        taskId: agentTaskSessions.taskId,
        adapterType: agentTaskSessions.adapterType,
        status: agentTaskSessions.status,
        lastCheckpointAt: agentTaskSessions.lastCheckpointAt,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        areaId: tasks.areaId,
        projectId: tasks.projectId,
      })
      .from(agentTaskSessions)
      .leftJoin(tasks, eq(agentTaskSessions.taskId, tasks.id))
      .where(
        and(
          eq(agentTaskSessions.operatorId, operatorId),
          eq(agentTaskSessions.status, 'queued'),
        ),
      )

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('[GET /api/agent-queue]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
