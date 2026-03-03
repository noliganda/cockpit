import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userColumns } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  fieldType: z.string().optional(),
  options: z.record(z.unknown()).nullable().optional(),
  required: z.boolean().optional(),
  defaultValue: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string; colId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId, colId } = await params
  const body = await request.json() as unknown
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const [col] = await db
    .update(userColumns)
    .set(parsed.data)
    .where(and(eq(userColumns.id, colId), eq(userColumns.tableId, tableId)))
    .returning()

  if (!col) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(col)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string; colId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId, colId } = await params
  await db.delete(userColumns).where(
    and(eq(userColumns.id, colId), eq(userColumns.tableId, tableId))
  )
  return NextResponse.json({ success: true })
}
