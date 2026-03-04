import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sprints } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { getSession } from '@/lib/auth'

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace')

    const rows = await db
      .select()
      .from(sprints)
      .where(workspaceId ? eq(sprints.workspaceId, workspaceId) : undefined)
      .orderBy(desc(sprints.createdAt))

    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/sprints]', error)
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

    const [sprint] = await db.insert(sprints).values(parsed.data).returning()

    await logActivity({
      workspaceId: sprint.workspaceId,
      action: 'created',
      entityType: 'sprint',
      entityId: sprint.id,
      entityTitle: sprint.name,
    })

    return NextResponse.json(sprint, { status: 201 })
  } catch (error) {
    console.error('[POST /api/sprints]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
