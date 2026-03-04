import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sprints } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { getSession } from '@/lib/auth'

type SprintUpdate = Partial<typeof sprints.$inferInsert>

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1)
    if (!sprint) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(sprint)
  } catch (error) {
    console.error('[GET /api/sprints/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await request.json() as SprintUpdate

    const [sprint] = await db
      .update(sprints)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(sprints.id, id))
      .returning()

    if (!sprint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await logActivity({
      workspaceId: sprint.workspaceId,
      action: 'updated',
      entityType: 'sprint',
      entityId: sprint.id,
      entityTitle: sprint.name,
      metadata: body as Record<string, unknown>,
    })

    return NextResponse.json(sprint)
  } catch (error) {
    console.error('[PATCH /api/sprints/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1)
    if (!sprint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.delete(sprints).where(eq(sprints.id, id))

    await logActivity({
      workspaceId: sprint.workspaceId,
      action: 'deleted',
      entityType: 'sprint',
      entityId: sprint.id,
      entityTitle: sprint.name,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/sprints/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
