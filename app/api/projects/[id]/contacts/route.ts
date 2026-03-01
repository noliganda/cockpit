import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projectContacts, contacts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const rows = await db
    .select({
      id: projectContacts.id,
      projectId: projectContacts.projectId,
      contactId: projectContacts.contactId,
      role: projectContacts.role,
      createdAt: projectContacts.createdAt,
      contact: contacts,
    })
    .from(projectContacts)
    .innerJoin(contacts, eq(projectContacts.contactId, contacts.id))
    .where(eq(projectContacts.projectId, id))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json() as { contactId?: string; role?: string }

  if (!body.contactId) return NextResponse.json({ error: 'contactId is required' }, { status: 400 })

  const [pc] = await db
    .insert(projectContacts)
    .values({
      projectId: id,
      contactId: body.contactId,
      role: body.role ?? 'Team',
    })
    .returning()

  return NextResponse.json(pc, { status: 201 })
}
