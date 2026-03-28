import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notes } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { getSession } from '@/lib/auth'

const createSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  content: z.unknown().optional(),
  contentPlaintext: z.string().optional(),
  pinned: z.boolean().optional(),
  projectId: z.string().uuid().nullable().optional(),
  areaId: z.string().uuid().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace')

    const rows = await db
      .select()
      .from(notes)
      .where(workspaceId ? eq(notes.workspaceId, workspaceId) : undefined)
      .orderBy(desc(notes.createdAt))

    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/notes]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as unknown
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const { content, ...rest } = parsed.data
    const [note] = await db.insert(notes).values({
      ...rest,
      content: content as Record<string, unknown> | null | undefined,
    }).returning()

    await logActivity({
      workspaceId: note.workspaceId,
      action: 'created',
      entityType: 'note',
      entityId: note.id,
      entityTitle: note.title,
      actorType: 'human',
      eventFamily: 'document',
      eventType: 'note_created',
      sourceSystem: 'dashboard',
      status: 'success',
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('[POST /api/notes]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
