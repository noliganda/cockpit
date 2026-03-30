import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { computeRollup } from '@/lib/task-hierarchy'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Verify parent exists
    const [parent] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!parent) return NextResponse.json({ error: 'Parent task not found' }, { status: 404 })

    const subtasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, id))
      .orderBy(asc(tasks.subtaskOrder), asc(tasks.createdAt))

    const rollup = await computeRollup(id)

    return NextResponse.json({ subtasks, rollup })
  } catch (error) {
    console.error('[GET /api/tasks/[id]/subtasks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
