import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

// Read-only Rolodex: person fields (name/emails/phones/jobTitle/company/linkedin/
// source) are owned by Twenty and synced in — never writable here. Only the two
// Cockpit-local fields, `notes` and `tags`, may be edited (they never sync back).
// No DELETE: contacts are removed at the source (Baïkal/Twenty), not in Cockpit.
const patchSchema = z
  .object({
    notes: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
  })
  .strict()

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1)
    if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(contact)
  } catch (error) {
    console.error('[GET /api/contacts/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const body = await request.json() as unknown
    const parsed = patchSchema.safeParse(body)
    // .strict() → any synced person field in the body is rejected outright (400),
    // so no UI or API path can write person data through this endpoint.
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const update: { notes?: string | null; tags?: string[] | null; updatedAt: Date } = { updatedAt: new Date() }
    if (parsed.data.notes !== undefined) update.notes = parsed.data.notes
    if (parsed.data.tags !== undefined) update.tags = parsed.data.tags

    const [contact] = await db
      .update(contacts)
      .set(update)
      .where(eq(contacts.id, id))
      .returning()

    if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await logActivity({
      workspaceId: contact.workspaceId,
      action: 'updated',
      entityType: 'contact',
      entityId: contact.id,
      entityTitle: contact.name,
      metadata: parsed.data as Record<string, unknown>,
      actorType: 'human',
      eventFamily: 'crm',
      eventType: 'contact_updated',
      sourceSystem: 'dashboard',
      status: 'success',
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('[PATCH /api/contacts/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
