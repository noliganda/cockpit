import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { organisations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { getSession } from '@/lib/auth'

type OrgUpdate = Partial<typeof organisations.$inferInsert>

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const [org] = await db.select().from(organisations).where(eq(organisations.id, id)).limit(1)
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(org)
  } catch (error) {
    console.error('[GET /api/organisations/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await request.json() as OrgUpdate

    const [org] = await db
      .update(organisations)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(organisations.id, id))
      .returning()

    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await logActivity({
      workspaceId: org.workspaceId,
      action: 'updated',
      entityType: 'organisation',
      entityId: org.id,
      entityTitle: org.name,
      metadata: body as Record<string, unknown>,
      actorType: 'human',
      eventFamily: 'crm',
      eventType: 'organisation_updated',
      sourceSystem: 'dashboard',
      status: 'success',
    })

    return NextResponse.json(org)
  } catch (error) {
    console.error('[PATCH /api/organisations/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const [org] = await db.select().from(organisations).where(eq(organisations.id, id)).limit(1)
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.delete(organisations).where(eq(organisations.id, id))

    await logActivity({
      workspaceId: org.workspaceId,
      action: 'deleted',
      entityType: 'organisation',
      entityId: org.id,
      entityTitle: org.name,
      actorType: 'human',
      eventFamily: 'crm',
      eventType: 'organisation_deleted',
      sourceSystem: 'dashboard',
      status: 'success',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/organisations/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
