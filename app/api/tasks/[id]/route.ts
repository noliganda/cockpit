import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, taskEvents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { getSession, getSessionData } from '@/lib/auth'
import { z } from 'zod'
import {
  isValidTransition,
  inferEventType,
  inferTimestamps,
  buildEventDescription,
  toNormalized,
} from '@/lib/task-lifecycle'
import { applyParentRollup, validateReparent, getChildCount } from '@/lib/task-hierarchy'

// ── Patch schema — all fields optional, validated where needed ───────────────

const patchSchema = z.object({
  // Core fields
  title: z.string().min(1).optional(),
  description: z.union([z.string(), z.array(z.unknown())]).optional(),
  priority: z.string().optional(),
  impact: z.string().optional(),
  effort: z.string().optional(),
  urgent: z.boolean().optional(),
  important: z.boolean().optional(),
  dueDate: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  areaId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
  region: z.string().nullable().optional(),

  // Status
  status: z.string().optional(),

  // OPS v5 ownership
  assigneeType: z.enum(['human', 'agent']).nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  supervisorId: z.string().nullable().optional(),
  supervisorName: z.string().nullable().optional(),
  executionMode: z.enum(['manual', 'agent', 'hybrid']).nullable().optional(),

  // OPS v5 provenance
  sourceType: z.enum(['slack', 'email', 'form', 'manual', 'api', 'imported']).nullable().optional(),
  sourceChannel: z.string().nullable().optional(),
  sourceMessageId: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),

  // OPS v5 lifecycle
  objectType: z.string().nullable().optional(),
  blockedReason: z.string().nullable().optional(),
  nextReviewAt: z.string().nullable().optional(),

  // OPS v5 review
  reviewRequired: z.boolean().optional(),
  reviewedBy: z.string().nullable().optional(),
  artifactUrl: z.string().nullable().optional(),
  artifactType: z.string().nullable().optional(),
  artifactStatus: z.string().nullable().optional(),
  completionSummary: z.string().nullable().optional(),

  // OPS v5 hierarchy
  parentTaskId: z.string().uuid().nullable().optional(),
  subtaskOrder: z.number().int().min(0).optional(),

  // Logging context — not persisted on task, used for event/activity log
  summaryNote: z.string().optional(),
  actorType: z.enum(['human', 'agent', 'system']).optional(),
  actorId: z.string().optional(),
  actorName: z.string().optional(),
})

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(task)
  } catch (error) {
    console.error('[GET /api/tasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionData = await getSessionData()
    if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (sessionData.role === 'guest') return NextResponse.json({ error: 'Forbidden: guests cannot edit' }, { status: 403 })

    const { id } = await params
    const body = await request.json() as unknown
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const data = parsed.data

    // Extract logging-only fields (not persisted on task row)
    const { summaryNote, actorType: reqActorType, actorId: reqActorId, actorName: reqActorName, ...taskFields } = data

    // Load current task
    const [current] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // ── Status transition validation ──────────────────────────────────────
    const statusChanging = taskFields.status !== undefined && taskFields.status !== current.status
    if (statusChanging && !isValidTransition(current.status, taskFields.status!)) {
      return NextResponse.json({
        error: `Invalid status transition: ${current.status} -> ${taskFields.status}`,
        currentNormalized: toNormalized(current.status),
        targetNormalized: toNormalized(taskFields.status!),
      }, { status: 422 })
    }

    // ── Hierarchy validation (reparenting) ──────────────────────────────
    if (taskFields.parentTaskId !== undefined && taskFields.parentTaskId !== current.parentTaskId) {
      if (taskFields.parentTaskId !== null) {
        const reparentCheck = await validateReparent(id, taskFields.parentTaskId)
        if (!reparentCheck.valid) {
          return NextResponse.json({ error: reparentCheck.error }, { status: 422 })
        }
      }
    }

    // ── Build update payload ──────────────────────────────────────────────
    const updateData: Record<string, unknown> = {
      ...taskFields,
      updatedAt: new Date(),
    }

    // Serialize JSON description blocks to string
    if (taskFields.description !== undefined && typeof taskFields.description !== 'string') {
      updateData.description = JSON.stringify(taskFields.description)
    }

    // Parse nextReviewAt string to Date
    if (taskFields.nextReviewAt !== undefined) {
      updateData.nextReviewAt = taskFields.nextReviewAt ? new Date(taskFields.nextReviewAt) : null
    }

    // ── Automatic timestamp side-effects for status changes ───────────────
    if (statusChanging) {
      const tsUpdates = inferTimestamps(current.status, taskFields.status!, current.startedAt)
      Object.assign(updateData, tsUpdates)
    } else {
      updateData.lastActivityAt = new Date()
    }

    // If reviewedBy is set, auto-set reviewedAt
    if (taskFields.reviewedBy) {
      updateData.reviewedAt = new Date()
    }

    // ── Detect assignment change ──────────────────────────────────────────
    const assignmentChanging = taskFields.assigneeId !== undefined && taskFields.assigneeId !== current.assigneeId

    // Sync legacy assignee field when assigneeName is set
    if (taskFields.assigneeName !== undefined && taskFields.assignee === undefined) {
      updateData.assignee = taskFields.assigneeName
    }

    // ── Apply update ──────────────────────────────────────────────────────
    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning()

    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // ── Determine event type ──────────────────────────────────────────────
    const actorType = reqActorType ?? 'human'
    const actorId = reqActorId ?? sessionData.userId
    const actorName = reqActorName ?? sessionData.email

    let eventType: string
    if (assignmentChanging && !statusChanging) {
      eventType = 'task_assigned'
    } else if (statusChanging) {
      eventType = inferEventType(current.status, taskFields.status!)
    } else {
      eventType = 'task_updated'
    }

    const eventDescription = buildEventDescription(eventType as import('@/types').TaskEventType, {
      taskTitle: task.title,
      actorName,
      blockedReason: taskFields.blockedReason ?? undefined,
      summaryNote,
      assigneeName: taskFields.assigneeName ?? undefined,
    })

    // ── Write task_events row ─────────────────────────────────────────────
    await db.insert(taskEvents).values({
      taskId: id,
      eventType,
      fromStatus: statusChanging ? current.status : null,
      toStatus: statusChanging ? taskFields.status! : null,
      actorType,
      actorId,
      actorName,
      summaryNote: summaryNote ?? null,
      blockedReason: taskFields.blockedReason ?? null,
      artifactUrl: taskFields.artifactUrl ?? null,
      metadata: {
        changedFields: Object.keys(taskFields),
        ...(summaryNote && { summaryNote }),
      },
    })

    // ── Write canonical activity_log event ────────────────────────────────
    await logActivity({
      workspaceId: task.workspaceId,
      actor: actorName,
      action: eventType.replace('task_', ''),
      entityType: 'task',
      entityId: task.id,
      entityTitle: task.title,
      description: eventDescription,
      metadata: {
        fromStatus: statusChanging ? current.status : undefined,
        toStatus: statusChanging ? taskFields.status : undefined,
        assigneeId: taskFields.assigneeId,
        assigneeName: taskFields.assigneeName,
        blockedReason: taskFields.blockedReason,
        artifactUrl: taskFields.artifactUrl,
        summaryNote,
      },
      actorType: actorType as 'human' | 'agent' | 'system',
      actorId,
      actorName,
      eventFamily: 'task',
      eventType,
      sourceSystem: actorType === 'agent' ? 'api' : 'dashboard',
      status: 'success',
    })

    // ── Parent rollup: if this is a subtask and status changed, update parent ─
    const effectiveParentId = task.parentTaskId ?? (
      // If we just reparented, use the new parent
      taskFields.parentTaskId !== undefined ? taskFields.parentTaskId : current.parentTaskId
    )
    if (effectiveParentId && statusChanging) {
      await applyParentRollup(effectiveParentId, id)
    }

    // If we moved away from a parent (reparented to null or different parent), rollup old parent too
    if (current.parentTaskId && taskFields.parentTaskId !== undefined && taskFields.parentTaskId !== current.parentTaskId) {
      await applyParentRollup(current.parentTaskId, id)
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('[PATCH /api/tasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionData = await getSessionData()
    if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (sessionData.role === 'guest') return NextResponse.json({ error: 'Forbidden: guests cannot delete' }, { status: 403 })

    const { id } = await params

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Block deletion of parents that still have children
    const childCount = await getChildCount(id)
    if (childCount > 0) {
      return NextResponse.json({
        error: `Cannot delete a parent task with ${childCount} subtask(s). Delete or reassign subtasks first.`,
        childCount,
      }, { status: 409 })
    }

    await db.delete(tasks).where(eq(tasks.id, id))

    await logActivity({
      workspaceId: task.workspaceId,
      action: 'deleted',
      entityType: 'task',
      entityId: task.id,
      entityTitle: task.title,
      actorType: 'human',
      actorId: sessionData.userId,
      actorName: sessionData.email,
      eventFamily: 'task',
      eventType: 'task_deleted',
      sourceSystem: 'dashboard',
      status: 'success',
    })

    // If this was a subtask, rollup the parent
    if (task.parentTaskId) {
      await applyParentRollup(task.parentTaskId, id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/tasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
