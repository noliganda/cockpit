import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bookmarks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; bid: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { bid } = await params

    await db.delete(bookmarks).where(eq(bookmarks.id, bid))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/projects/[id]/bookmarks/[bid]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
