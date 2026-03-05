import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userBases } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const workspace = searchParams.get('workspace')

    const query = workspace
      ? db.select().from(userBases).where(eq(userBases.workspace, workspace)).orderBy(userBases.createdAt)
      : db.select().from(userBases).orderBy(userBases.createdAt)

    const bases = await query
    return NextResponse.json(bases)
  } catch (error) {
    console.error('[GET /api/tables/bases]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, description, workspace = 'personal' } = body

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const [base] = await db.insert(userBases).values({ name: name.trim(), description, workspace }).returning()
    return NextResponse.json(base, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tables/bases]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
