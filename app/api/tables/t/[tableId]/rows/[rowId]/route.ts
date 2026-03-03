import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userRows } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  data: z.record(z.unknown()).optional(),
  sortOrder: z.number().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string; rowId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId, rowId } = await params
  const [row] = await db.select().from(userRows).where(
    and(eq(userRows.id, rowId), eq(userRows.tableId, tableId))
  )
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string; rowId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId, rowId } = await params
  const body = await request.json() as unknown
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  // Fetch existing row to merge data
  const [existing] = await db.select().from(userRows).where(
    and(eq(userRows.id, rowId), eq(userRows.tableId, tableId))
  )
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newData = parsed.data.data
    ? { ...(existing.data as Record<string, unknown>), ...parsed.data.data }
    : existing.data

  const [row] = await db
    .update(userRows)
    .set({ data: newData, updatedAt: new Date(), sortOrder: parsed.data.sortOrder ?? existing.sortOrder })
    .where(and(eq(userRows.id, rowId), eq(userRows.tableId, tableId)))
    .returning()

  return NextResponse.json(row)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string; rowId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId, rowId } = await params
  await db.delete(userRows).where(
    and(eq(userRows.id, rowId), eq(userRows.tableId, tableId))
  )
  return NextResponse.json({ success: true })
}
