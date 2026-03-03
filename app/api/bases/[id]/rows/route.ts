import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { baseRows } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const rows = await db
    .select()
    .from(baseRows)
    .where(eq(baseRows.baseId, id))
    .orderBy(asc(baseRows.createdAt))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await request.json() as { data?: Record<string, unknown> }

  const [row] = await db
    .insert(baseRows)
    .values({ baseId: id, data: body.data ?? {} })
    .returning()

  return NextResponse.json(row, { status: 201 })
}
