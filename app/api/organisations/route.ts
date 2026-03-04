import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { organisations } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { getSession } from '@/lib/auth'

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  industry: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  pipelineStage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  size: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace')

    const rows = await db
      .select()
      .from(organisations)
      .where(workspaceId ? eq(organisations.workspaceId, workspaceId) : undefined)
      .orderBy(desc(organisations.createdAt))

    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/organisations]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as unknown
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const insertData = {
      ...parsed.data,
      email: parsed.data.email || undefined,
    }
    const [org] = await db.insert(organisations).values(insertData).returning()

    await logActivity({
      workspaceId: org.workspaceId,
      action: 'created',
      entityType: 'organisation',
      entityId: org.id,
      entityTitle: org.name,
    })

    return NextResponse.json(org, { status: 201 })
  } catch (error) {
    console.error('[POST /api/organisations]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
