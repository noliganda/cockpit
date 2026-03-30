import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, taskEvents } from '@/lib/db/schema'
import { eq, desc, isNull } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { buildEventDescription } from '@/lib/task-lifecycle'
import { validateParent, inheritFromParent } from '@/lib/task-hierarchy'
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

  // OPS v5 ownership
  assigneeType: z.enum(['human', 'agent']).optional(),
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
  supervisorId: z.string().optional(),
  supervisorName: z.string().optional(),
  executionMode: z.enum(['manual', 'agent', 'hybrid']).optional(),

  // OPS v5 provenance
  sourceType: z.enum(['slack', 'email', 'form', 'manual', 'api', 'imported']).optional(),
  sourceChannel: z.string().optional(),
  sourceMessageId: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourceCreatedAt: z.string().optional(),

  // OPS v5 classification
  objectType: z.string().optional(),

  // OPS v5 review
  reviewRequired: z.boolean().optional(),

  // OPS v5 hierarchy
  parentTaskId: z.string().uuid().optional(),
  subtaskOrder: z.number().int().min(0).optional(),

  // Logging context
  actorType: z.enum(['human', 'agent', 'system']).optional(),
  actorId: z.string().optional(),
  actorName: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace')
    const topLevel = searchParams.get('topLevel')
    const parentId = searchParams.get('parentTaskId')

    let query = db.select().from(tasks)

    // Filter by workspace
    if (workspaceId) {
      query = query.where(eq(tasks.workspaceId, workspaceId)) as typeof query
    }

    // Filter: top-level only (no parent) — keeps subtasks off the main board
    if (topLevel === 'true') {
      query = query.where(isNull(tasks.parentTaskId)) as typeof query
    }

    // Filter: children of a specific parent
    if (parentId) {
      query = query.where(eq(tasks.parentTaskId, parentId)) as typeof query
    }

    const rows = await query.orderBy(desc(tasks.createdAt))

    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/tasks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionData = await getSessionData()
    if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (sessionData.role === 'guest') return NextResponse.json({ error: 'Forbidden: guests cannot create tasks' }, { status: 403 })

    const body = await request.json() as unknown
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const { actorType: reqActorType, actorId: reqActorId, actorName: reqActorName, ...fields } = parsed.data

    const now = new Date()
    const isSubtask = !!fields.parentTaskId

    // ── Hierarchy validation ──────────────────────────────────────────────
    let parentTask: Awaited<ReturnType<typeof validateParent>>['parent'] = null
    if (isSubtask) {
      const validation = await validateParent(fields.parentTaskId!)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 422 })
      }
      parentTask = validation.parent
    }

    // ── Build insert data ─────────────────────────────────────────────────
    // Subtasks inherit parent context where not explicitly provided
    const inherited = isSubtask && parentTask
      ? inheritFromParent(parentTask)
      : {}

    const insertData = {
      ...inherited,
      ...fields,
      description: fields.description !== undefined
        ? (typeof fields.description === 'string' ? fields.description : JSON.stringify(fields.description))
        : undefined,
      sourceCreatedAt: fields.sourceCreatedAt ? new Date(fields.sourceCreatedAt) : undefined,
      lastActivityAt: now,
      // Sync legacy assignee from assigneeName if assignee not explicitly set
      assignee: fields.assignee ?? fields.assigneeName ?? undefined,
    } as typeof tasks.$inferInsert

    const [task] = await db.insert(tasks).values(insertData).returning()

    // ── Write task_events row ─────────────────────────────────────────────
    const actorType = reqActorType ?? 'human'
    const actorId = reqActorId ?? sessionData.userId
    const actorName = reqActorName ?? sessionData.email
    const eventType = isSubtask ? 'subtask_created' : 'task_created'

    await db.insert(taskEvents).values({
      taskId: task.id,
      eventType,
      toStatus: task.status,
      actorType,
      actorId,
      actorName,
      metadata: {
        sourceType: fields.sourceType,
        assigneeId: fields.assigneeId,
        objectType: fields.objectType,
        parentTaskId: fields.parentTaskId,
      },
    })

    // ── Write canonical activity_log event ────────────────────────────────
    const eventDescription = isSubtask
      ? `${actorName} created subtask "${task.title}" under "${parentTask?.title ?? 'parent'}"`
      : buildEventDescription('task_created', { taskTitle: task.title, actorName })

    await logActivity({
      workspaceId: task.workspaceId,
      actor: actorName,
      action: 'created',
      entityType: 'task',
      entityId: task.id,
      entityTitle: task.title,
      description: eventDescription,
      metadata: {
        assigneeType: fields.assigneeType,
        assigneeId: fields.assigneeId,
        assigneeName: fields.assigneeName,
        executionMode: fields.executionMode,
        sourceType: fields.sourceType,
        sourceChannel: fields.sourceChannel,
        objectType: fields.objectType,
        parentTaskId: fields.parentTaskId,
        isSubtask,
      },
      actorType: actorType as 'human' | 'agent' | 'system',
      actorId,
      actorName,
      eventFamily: 'task',
      eventType,
      sourceSystem: actorType === 'agent' ? 'api' : 'dashboard',
      status: 'success',
    })

    // ── Emit event on parent when subtask is created ──────────────────────
    if (isSubtask && parentTask) {
      await db.insert(taskEvents).values({
        taskId: parentTask.id,
        eventType: 'subtask_created',
        actorType,
        actorId,
        actorName,
        summaryNote: `Subtask "${task.title}" created`,
        metadata: { childTaskId: task.id, childTitle: task.title },
      })
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tasks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
