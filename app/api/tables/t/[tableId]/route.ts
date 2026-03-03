import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userTables } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const [table] = await db.select().from(userTables).where(eq(userTables.id, tableId))
  if (!table) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(table)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const body = await request.json() as unknown
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const [table] = await db
    .update(userTables)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(userTables.id, tableId))
    .returning()

  if (!table) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(table)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  await db.delete(userTables).where(eq(userTables.id, tableId))
  return NextResponse.json({ success: true })
}
