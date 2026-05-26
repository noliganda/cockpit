import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, taskEvents } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession, getSessionData } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.', code: 'unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const events = await db
      .select()
      .from(taskEvents)
      .where(eq(taskEvents.taskId, id))
      .orderBy(desc(taskEvents.createdAt))

    return NextResponse.json(events)
  } catch (error) {
    console.error('[GET /api/tasks/[id]/events]', error)
    return NextResponse.json({ error: 'Internal server error', code: 'server_error' }, { status: 500 })
  }
}

// ── Structured progress events ───────────────────────────────────────────────
// Append a machine-readable event (progress, artifact, verification, blocker,
// heartbeat) without mutating the task's status. Status transitions and
// checkout stay on PATCH /api/tasks/[id].

const eventSchema = z.object({
  // Free-form event type, e.g. progress | artifact_attached | verification |
  // heartbeat | blocker_noted | handoff. Defaults to a generic progress event.
  eventType: z.string().min(1).default('task_progress'),
  summaryNote: z.string().optional(),
  blockedReason: z.string().optional(),
  artifactUrl: z.string().optional(),
  // success | pending | failed | cancelled | partial — outcome of this event
  status: z.enum(['success', 'pending', 'failed', 'cancelled', 'partial']).optional(),
  // Structured payload: commit SHA, PR URL, changed files, verification cmd/result,
  // token/cost metrics, etc. Do not include secrets.
  metadata: z.record(z.unknown()).optional(),

  // Provenance overrides (otherwise inferred from the harness session)
  actorType: z.enum(['human', 'agent', 'system']).optional(),
  actorId: z.string().optional(),
  actorName: z.string().optional(),
  executingModel: z.string().optional(),
  executingSessionId: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionData = await getSessionData()
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Not authenticated. Send Authorization: Bearer $COCKPIT_API_TOKEN.', code: 'unauthorized' },
        { status: 401 },
      )
    }
    if (sessionData.role === 'guest') {
      return NextResponse.json({ error: 'Guests cannot write events.', code: 'forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = (await request.json()) as unknown
    const parsed = eventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format(), code: 'validation_error' }, { status: 400 })
    }
    const data = parsed.data

    // Verify the task exists
    const [task] = await db
      .select({ id: tasks.id, title: tasks.title, workspaceId: tasks.workspaceId })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1)
    if (!task) {
      return NextResponse.json({ error: 'Task not found.', code: 'not_found' }, { status: 404 })
    }

    // Resolve actor + provenance (same convention as task create/patch)
    const actorType = data.actorType ?? (sessionData.harnessName ? 'agent' : 'human')
    const actorId = data.actorId ?? sessionData.userId
    const actorName = data.actorName ?? sessionData.harnessName ?? sessionData.email
    const executingModel = data.executingModel ?? sessionData.harnessModel
    const executingSessionId = data.executingSessionId ?? sessionData.harnessSessionId

    const [event] = await db
      .insert(taskEvents)
      .values({
        taskId: id,
        eventType: data.eventType,
        actorType,
        actorId,
        actorName,
        summaryNote: data.summaryNote ?? null,
        blockedReason: data.blockedReason ?? null,
        artifactUrl: data.artifactUrl ?? null,
        metadata: {
          ...(data.metadata ?? {}),
          status: data.status,
          harnessName: sessionData.harnessName,
          executingModel,
          executingSessionId,
        },
      })
      .returning()

    // Keep the task's activity clock current
    await db
      .update(tasks)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, id))

    // Mirror to the canonical event spine
    await logActivity({
      workspaceId: task.workspaceId,
      actor: actorName,
      action: data.eventType.replace(/^task_/, ''),
      entityType: 'task',
      entityId: task.id,
      entityTitle: task.title,
      description: data.summaryNote ?? `${actorName} logged ${data.eventType} on "${task.title}"`,
      metadata: {
        ...(data.metadata ?? {}),
        blockedReason: data.blockedReason,
        artifactUrl: data.artifactUrl,
        harnessName: sessionData.harnessName,
        executingModel,
        executingSessionId,
      },
      actorType: actorType as 'human' | 'agent' | 'system',
      actorId,
      actorName,
      eventFamily: 'task',
      eventType: data.eventType,
      sourceSystem: actorType === 'agent' ? 'api' : 'dashboard',
      workflowRunId: executingSessionId,
      apiModel: executingModel,
      status: data.status ?? 'success',
      ...(data.artifactUrl ? { artifactCount: 1 } : {}),
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tasks/[id]/events]', error)
    return NextResponse.json({ error: 'Internal server error', code: 'server_error' }, { status: 500 })
  }
}
