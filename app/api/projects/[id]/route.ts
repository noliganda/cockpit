import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { getSession } from '@/lib/auth'

type ProjectUpdate = Partial<typeof projects.$inferInsert>

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json() as ProjectUpdate

  const [project] = await db
    .update(projects)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await logActivity({
    workspaceId: project.workspaceId,
    action: 'updated',
    entityType: 'project',
    entityId: project.id,
    entityTitle: project.name,
    metadata: body as Record<string, unknown>,
  })

  return NextResponse.json(project)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(projects).where(eq(projects.id, id))

  await logActivity({
    workspaceId: project.workspaceId,
    action: 'deleted',
    entityType: 'project',
    entityId: project.id,
    entityTitle: project.name,
  })

  return NextResponse.json({ success: true })
}
