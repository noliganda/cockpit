import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { getSession, getSessionData } from '@/lib/auth'

const createSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  description: z.union([z.string(), z.array(z.unknown())]).optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  impact: z.string().optional(),
  effort: z.string().optional(),
  urgent: z.boolean().optional(),
  important: z.boolean().optional(),
  dueDate: z.string().optional(),
  assignee: z.string().optional(),
  tags: z.array(z.string()).optional(),
  areaId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  sprintId: z.string().uuid().optional(),
  region: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace')

  const rows = await db
    .select()
    .from(tasks)
    .where(workspaceId ? eq(tasks.workspaceId, workspaceId) : undefined)
    .orderBy(desc(tasks.createdAt))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const sessionData = await getSessionData()
  if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (sessionData.role === 'guest') return NextResponse.json({ error: 'Forbidden: guests cannot create tasks' }, { status: 403 })

  const body = await request.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const insertData = {
    ...parsed.data,
    description: parsed.data.description !== undefined
      ? (typeof parsed.data.description === 'string' ? parsed.data.description : JSON.stringify(parsed.data.description))
      : undefined,
  }
  const [task] = await db.insert(tasks).values(insertData).returning()

  await logActivity({
    workspaceId: task.workspaceId,
    action: 'created',
    entityType: 'task',
    entityId: task.id,
    entityTitle: task.title,
  })

  return NextResponse.json(task, { status: 201 })
}
