import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userColumns } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tableId } = await params
    const columns = await db
      .select()
      .from(userColumns)
      .where(eq(userColumns.tableId, tableId))
      .orderBy(userColumns.order)

    return NextResponse.json(columns)
  } catch (error) {
    console.error('[GET /api/tables/[tableId]/columns]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tableId } = await params
    const body = await req.json()
    const { name, columnType = 'text', options, order = 0 } = body

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const [column] = await db
      .insert(userColumns)
      .values({ tableId, name: name.trim(), columnType, options: options ?? null, order })
      .returning()

    return NextResponse.json(column, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tables/[tableId]/columns]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
