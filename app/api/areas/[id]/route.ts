import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { areas } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { getSession } from '@/lib/auth'

type AreaUpdate = Partial<typeof areas.$inferInsert>

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const [area] = await db.select().from(areas).where(eq(areas.id, id)).limit(1)
  if (!area) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(area)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json() as AreaUpdate

  const [area] = await db
    .update(areas)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(areas.id, id))
    .returning()

  if (!area) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await logActivity({
    workspaceId: area.workspaceId,
    action: 'updated',
    entityType: 'area',
    entityId: area.id,
    entityTitle: area.name,
    metadata: body as Record<string, unknown>,
  })

  return NextResponse.json(area)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const [area] = await db.select().from(areas).where(eq(areas.id, id)).limit(1)
  if (!area) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(areas).where(eq(areas.id, id))

  await logActivity({
    workspaceId: area.workspaceId,
    action: 'deleted',
    entityType: 'area',
    entityId: area.id,
    entityTitle: area.name,
  })

  return NextResponse.json({ success: true })
}
