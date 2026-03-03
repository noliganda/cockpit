import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userRows } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ tableId: string; rowId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rowId } = await params
  const body = await req.json()
  const { data } = body

  if (data === undefined) return NextResponse.json({ error: 'data is required' }, { status: 400 })

  const [row] = await db
    .update(userRows)
    .set({ data, updatedAt: new Date() })
    .where(eq(userRows.id, rowId))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ tableId: string; rowId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rowId } = await params
  await db.delete(userRows).where(eq(userRows.id, rowId))
  return NextResponse.json({ ok: true })
}
