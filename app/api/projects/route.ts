import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { getSession } from '@/lib/auth'

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  areaId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  region: z.string().optional(),
  projectManagerId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  leadGenId: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace')

  const rows = await db
    .select()
    .from(projects)
    .where(workspaceId ? eq(projects.workspaceId, workspaceId) : undefined)
    .orderBy(desc(projects.createdAt))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const [project] = await db.insert(projects).values(parsed.data).returning()

  await logActivity({
    workspaceId: project.workspaceId,
    action: 'created',
    entityType: 'project',
    entityId: project.id,
    entityTitle: project.name,
  })

  return NextResponse.json(project, { status: 201 })
}
