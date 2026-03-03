import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { baseRows } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; rowId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rowId } = await params

  const body = await request.json() as { data?: Record<string, unknown> }

  const [row] = await db
    .update(baseRows)
    .set({ data: body.data, updatedAt: new Date() })
    .where(eq(baseRows.id, rowId))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; rowId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rowId } = await params
  await db.delete(baseRows).where(eq(baseRows.id, rowId))
  return NextResponse.json({ success: true })
}
