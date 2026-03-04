import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userTables, userColumns } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ baseId: string; tableId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const [table] = await db.select().from(userTables).where(eq(userTables.id, tableId))
  if (!table) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const columns = await db
    .select()
    .from(userColumns)
    .where(eq(userColumns.tableId, tableId))
    .orderBy(userColumns.order)

  return NextResponse.json({ ...table, columns })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ baseId: string; tableId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const body = await req.json()
  const { name, description } = body

  const [table] = await db
    .update(userTables)
    .set({ name, description, updatedAt: new Date() })
    .where(eq(userTables.id, tableId))
    .returning()

  if (!table) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(table)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ baseId: string; tableId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  await db.delete(userTables).where(eq(userTables.id, tableId))
  return NextResponse.json({ ok: true })
}
