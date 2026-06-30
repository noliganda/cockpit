import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, taskEvents } from '@/lib/db/schema'
import { and, eq, desc, isNull } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { buildEventDescription } from '@/lib/task-lifecycle'
import { validateParent, inheritFromParent } from '@/lib/task-hierarchy'
import { getWorkspaceIds } from '@/lib/workspaces'
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
  assigneeType: z.enum(['human', 'agent', 'function']).optional(),
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

  // Ephemeral execution footprint
  executingModel: z.string().optional(),
  executingSessionId: z.string().optional(),

  // Logging context
  actorType: z.enum(['human', 'agent', 'system']).optional(),
  actorId: z.string().optional(),
  actorName: z.string().optional(),

  // Idempotency: a retried create with the same key returns the existing task
  // instead of duplicating. May also be passed via the `Idempotency-Key` header.
  idempotencyKey: z.string().min(1).max(255).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    // Accept both `workspace` (dashboard) and `workspaceId` (matches the create
    // body field) so a filter param is never silently ignored.
    const workspaceId = searchParams.get('workspace') ?? searchParams.get('workspaceId')
    const topLevel = searchParams.get('topLevel')
    const parentId = searchParams.get('parentTaskId')

    let query = db.select().from(tasks)

    // Build all filters, then apply in a single .where() — Drizzle's .where() is
    // NOT additive: a second call silently replaces the first, so chaining
    // workspace + topLevel + parentTaskId drops the earlier filters.
    const filters = []
    if (workspaceId) {
      filters.push(eq(tasks.workspaceId, workspaceId))
    }
    // Filter: top-level only (no parent) — keeps subtasks off the main board
    if (topLevel === 'true') {
      filters.push(isNull(tasks.parentTaskId))
    }
    // Filter: children of a specific parent
    if (parentId) {
      filters.push(eq(tasks.parentTaskId, parentId))
    }
    if (filters.length > 0) {
      query = query.where(and(...filters)) as typeof query
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

    const { actorType: reqActorType, actorId: reqActorId, actorName: reqActorName, idempotencyKey: bodyIdemKey, ...fields } = parsed.data

    // ── Workspace validation ──────────────────────────────────────────────
    // tasks.workspaceId is free text; reject unknown IDs so harness writes
    // don't silently create invisible orphan tasks (e.g. "bf" vs "byron-film").
    const validWorkspaceIds = await getWorkspaceIds()
    if (validWorkspaceIds.length > 0 && !validWorkspaceIds.includes(fields.workspaceId)) {
      return NextResponse.json({
        error: `Unknown workspaceId "${fields.workspaceId}". Use GET /api/workspaces to list valid IDs.`,
        code: 'invalid_workspace',
        validWorkspaceIds,
      }, { status: 422 })
    }

    // ── Idempotency replay ────────────────────────────────────────────────
    // A retried create with the same key returns the existing task (200) instead
    // of duplicating. Best-effort against sequential retries, not concurrent races.
    const idempotencyKey = (request.headers.get('idempotency-key') ?? bodyIdemKey ?? '').trim() || null
    if (idempotencyKey) {
      try {
        const [existing] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.idempotencyKey, idempotencyKey))
          .limit(1)
        if (existing) {
          return NextResponse.json(existing, { status: 200, headers: { 'Idempotent-Replay': 'true' } })
        }
      } catch (err) {
        // Column may not exist yet (migration 0008 unapplied) — degrade to a normal create.
        console.warn('[POST /api/tasks] idempotency lookup skipped (apply migration 0008?):', err)
      }
    }

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

    // Persist the idempotency key out-of-band so a missing column (pre-migration)
    // can never block task creation — dedup just stays off until 0008 is applied.
    if (idempotencyKey) {
      try {
        await db.update(tasks).set({ idempotencyKey }).where(eq(tasks.id, task.id))
      } catch (err) {
        console.warn('[POST /api/tasks] could not store idempotency key (apply migration 0008?):', err)
      }
    }

    // ── Write task_events row ─────────────────────────────────────────────
    const actorType = reqActorType ?? (sessionData.harnessName ? 'agent' : 'human')
    const actorId = reqActorId ?? sessionData.userId

    let actorName = reqActorName
    if (!actorName) {
      actorName = sessionData.harnessName ?? sessionData.email
    }
    const harnessModel = fields.executingModel ?? sessionData.harnessModel
    const harnessSessionId = fields.executingSessionId ?? sessionData.harnessSessionId

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
        harnessName: sessionData.harnessName,
        executingModel: harnessModel,
        executingSessionId: harnessSessionId,
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
        harnessName: sessionData.harnessName,
        executingModel: harnessModel,
        executingSessionId: harnessSessionId,
      },
      actorType: actorType as 'human' | 'agent' | 'system',
      actorId,
      actorName,
      eventFamily: 'task',
      eventType,
      sourceSystem: actorType === 'agent' ? 'api' : 'dashboard',
      workflowRunId: harnessSessionId,
      apiModel: harnessModel,
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
