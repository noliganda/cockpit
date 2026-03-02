import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bases, baseRows } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const columnSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url', 'email', 'person', 'relation']),
  options: z.array(z.string()).optional(),
})

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  schema: z.array(columnSchema).optional().default([]),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace')

  const allBases = await db
    .select()
    .from(bases)
    .where(workspaceId ? eq(bases.workspaceId, workspaceId) : undefined)
    .orderBy(desc(bases.createdAt))

  // Get row counts
  const rowCounts = await db
    .select({ baseId: baseRows.baseId, count: sql<number>`count(*)::int` })
    .from(baseRows)
    .groupBy(baseRows.baseId)

  const countMap = Object.fromEntries(rowCounts.map(r => [r.baseId, r.count]))

  return NextResponse.json(allBases.map(b => ({ ...b, rowCount: countMap[b.id] ?? 0 })))
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const [base] = await db
    .insert(bases)
    .values({
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      schema: parsed.data.schema,
    })
    .returning()

  return NextResponse.json(base, { status: 201 })
}
