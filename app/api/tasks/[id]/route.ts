import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { getSession } from '@/lib/auth'

type TaskUpdate = Partial<typeof tasks.$inferInsert>

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(task)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json() as TaskUpdate

  const [task] = await db
    .update(tasks)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning()

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await logActivity({
    workspaceId: task.workspaceId,
    action: 'updated',
    entityType: 'task',
    entityId: task.id,
    entityTitle: task.title,
    metadata: body as Record<string, unknown>,
  })

  return NextResponse.json(task)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(tasks).where(eq(tasks.id, id))

  await logActivity({
    workspaceId: task.workspaceId,
    action: 'deleted',
    entityType: 'task',
    entityId: task.id,
    entityTitle: task.title,
  })

  return NextResponse.json({ success: true })
}
