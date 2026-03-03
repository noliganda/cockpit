import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userBases } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace')

  const rows = await db
    .select()
    .from(userBases)
    .where(workspaceId ? eq(userBases.workspaceId, workspaceId) : undefined)
    .orderBy(desc(userBases.createdAt))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const [base] = await db.insert(userBases).values(parsed.data).returning()
  return NextResponse.json(base, { status: 201 })
}
