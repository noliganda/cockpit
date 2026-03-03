import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userColumns } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ tableId: string; columnId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { columnId } = await params
  const body = await req.json()
  const { name, columnType, options, order } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (columnType !== undefined) updates.columnType = columnType
  if (options !== undefined) updates.options = options
  if (order !== undefined) updates.order = order

  const [column] = await db
    .update(userColumns)
    .set(updates)
    .where(eq(userColumns.id, columnId))
    .returning()

  if (!column) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(column)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ tableId: string; columnId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { columnId } = await params
  await db.delete(userColumns).where(eq(userColumns.id, columnId))
  return NextResponse.json({ ok: true })
}
