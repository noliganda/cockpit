import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userRows } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') ?? '100')))
  const offset = (page - 1) * limit

  const rows = await db
    .select()
    .from(userRows)
    .where(eq(userRows.tableId, tableId))
    .orderBy(userRows.createdAt)
    .limit(limit)
    .offset(offset)

  return NextResponse.json({ rows, page, limit })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const body = await req.json()
  const { data = {} } = body

  const [row] = await db
    .insert(userRows)
    .values({ tableId, data })
    .returning()

  return NextResponse.json(row, { status: 201 })
}
