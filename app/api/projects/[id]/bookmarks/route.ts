import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bookmarks } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const rows = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.projectId, id))
    .orderBy(desc(bookmarks.createdAt))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json() as { title?: string; url?: string }

  if (!body.title || !body.url) return NextResponse.json({ error: 'title and url are required' }, { status: 400 })

  const [bookmark] = await db
    .insert(bookmarks)
    .values({
      projectId: id,
      title: body.title,
      url: body.url,
    })
    .returning()

  return NextResponse.json(bookmark, { status: 201 })
}
