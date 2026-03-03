import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userRows } from '@/lib/db/schema'
import { eq, asc, desc, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const PAGE_SIZE = 50

const createSchema = z.object({
  data: z.record(z.unknown()).default({}),
  sortOrder: z.number().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(500, parseInt(searchParams.get('limit') ?? String(PAGE_SIZE)))
  const offset = (page - 1) * limit
  const sortDir = searchParams.get('sort') === 'desc' ? desc : asc

  const [rows, countResult] = await Promise.all([
    db.select()
      .from(userRows)
      .where(eq(userRows.tableId, tableId))
      .orderBy(sortDir(userRows.sortOrder), asc(userRows.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(userRows)
      .where(eq(userRows.tableId, tableId)),
  ])

  return NextResponse.json({
    rows,
    total: countResult[0]?.count ?? 0,
    page,
    limit,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const body = await request.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  // Get next sort order
  const existing = await db
    .select({ sortOrder: userRows.sortOrder })
    .from(userRows)
    .where(eq(userRows.tableId, tableId))

  const maxOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), -1)

  const [row] = await db.insert(userRows).values({
    tableId,
    data: parsed.data.data,
    sortOrder: parsed.data.sortOrder ?? maxOrder + 1,
  }).returning()

  return NextResponse.json(row, { status: 201 })
}
