import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { getSession } from '@/lib/auth'

type ContactUpdate = Partial<typeof contacts.$inferInsert>

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1)
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(contact)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json() as ContactUpdate

  const [contact] = await db
    .update(contacts)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(contacts.id, id))
    .returning()

  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await logActivity({
    workspaceId: contact.workspaceId,
    action: 'updated',
    entityType: 'contact',
    entityId: contact.id,
    entityTitle: contact.name,
    metadata: body as Record<string, unknown>,
  })

  return NextResponse.json(contact)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1)
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(contacts).where(eq(contacts.id, id))

  await logActivity({
    workspaceId: contact.workspaceId,
    action: 'deleted',
    entityType: 'contact',
    entityId: contact.id,
    entityTitle: contact.name,
  })

  return NextResponse.json({ success: true })
}
