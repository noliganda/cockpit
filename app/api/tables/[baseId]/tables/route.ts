import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userTables } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ baseId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { baseId } = await params
    const tables = await db.select().from(userTables).where(eq(userTables.baseId, baseId)).orderBy(userTables.createdAt)
    return NextResponse.json(tables)
  } catch (error) {
    console.error('[GET /api/tables/[baseId]/tables]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ baseId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { baseId } = await params
    const body = await req.json()
    const { name, description } = body

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const [table] = await db
      .insert(userTables)
      .values({ baseId, name: name.trim(), description })
      .returning()

    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tables/[baseId]/tables]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
