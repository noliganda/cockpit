import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { getSession } from '@/lib/auth'

type NoteUpdate = Partial<typeof notes.$inferInsert>

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const [note] = await db.select().from(notes).where(eq(notes.id, id)).limit(1)
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(note)
  } catch (error) {
    console.error('[GET /api/notes/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await request.json() as NoteUpdate

    const [note] = await db
      .update(notes)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning()

    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await logActivity({
      workspaceId: note.workspaceId,
      action: 'updated',
      entityType: 'note',
      entityId: note.id,
      entityTitle: note.title,
      metadata: body as Record<string, unknown>,
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error('[PATCH /api/notes/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const [note] = await db.select().from(notes).where(eq(notes.id, id)).limit(1)
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.delete(notes).where(eq(notes.id, id))

    await logActivity({
      workspaceId: note.workspaceId,
      action: 'deleted',
      entityType: 'note',
      entityId: note.id,
      entityTitle: note.title,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/notes/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
