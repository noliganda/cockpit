import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, taskDependencies } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSessionData } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

// DELETE /api/tasks/[id]/dependencies/[prereqId]
// Remove the edge making [id] depend on [prereqId]. See COCKPIT-DISPATCH-ENGINE-SPEC.md §6.3.
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; prereqId: string }> },
) {
  try {
    const sessionData = await getSessionData()
    if (!sessionData) {
      return NextResponse.json({ error: 'Not authenticated.', code: 'unauthorized' }, { status: 401 })
    }
    if (sessionData.role === 'guest') {
      return NextResponse.json({ error: 'Guests cannot edit dependencies.', code: 'forbidden' }, { status: 403 })
    }

    const { id: dependentTaskId, prereqId: prerequisiteTaskId } = await params

    const [edge] = await db
      .select()
      .from(taskDependencies)
      .where(and(
        eq(taskDependencies.dependentTaskId, dependentTaskId),
        eq(taskDependencies.prerequisiteTaskId, prerequisiteTaskId),
      ))
      .limit(1)
    if (!edge) {
      return NextResponse.json({ error: 'Dependency not found.', code: 'not_found' }, { status: 404 })
    }

    await db.delete(taskDependencies).where(eq(taskDependencies.id, edge.id))

    const [dependent] = await db
      .select({ id: tasks.id, title: tasks.title, workspaceId: tasks.workspaceId })
      .from(tasks)
      .where(eq(tasks.id, dependentTaskId))
      .limit(1)

    await logActivity({
      workspaceId: dependent?.workspaceId ?? 'personal',
      actor: sessionData.harnessName ?? sessionData.email,
      action: 'dependency_removed',
      entityType: 'task',
      entityId: dependentTaskId,
      entityTitle: dependent?.title,
      description: `Removed dependency on ${prerequisiteTaskId} (${edge.dependencyType})`,
      metadata: { prerequisiteTaskId, dependencyType: edge.dependencyType },
      actorType: sessionData.harnessName ? 'agent' : 'human',
      actorId: sessionData.userId,
      actorName: sessionData.harnessName ?? sessionData.email,
      eventFamily: 'task',
      eventType: 'dependency_removed',
      sourceSystem: sessionData.harnessName ? 'api' : 'dashboard',
      status: 'success',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/tasks/[id]/dependencies/[prereqId]]', error)
    return NextResponse.json({ error: 'Internal server error', code: 'server_error' }, { status: 500 })
  }
}
