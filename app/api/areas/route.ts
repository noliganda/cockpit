import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { areas } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { getSession } from '@/lib/auth'

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().optional(),
  context: z.string().optional(),
  spheresOfResponsibility: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace')

  const rows = await db
    .select()
    .from(areas)
    .where(workspaceId ? eq(areas.workspaceId, workspaceId) : undefined)
    .orderBy(asc(areas.order))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const [area] = await db.insert(areas).values(parsed.data).returning()

  await logActivity({
    workspaceId: area.workspaceId,
    action: 'created',
    entityType: 'area',
    entityId: area.id,
    entityTitle: area.name,
  })

  return NextResponse.json(area, { status: 201 })
}
