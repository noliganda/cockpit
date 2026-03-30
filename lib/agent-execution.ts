import { db } from './db'
import { agentTaskSessions, agentWakeupRequests, tasks } from './db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logActivity } from './activity'

/**
 * Create or return an existing queued agent task session for a given task and operator.
 */
export async function createTaskSession(
  taskId: string,
  operatorId: string,
  adapterType: string,
) {
  // Avoid duplicate sessions: check for existing active or queued session
  const [existing] = await db
    .select()
    .from(agentTaskSessions)
    .where(
      and(
        eq(agentTaskSessions.operatorId, operatorId),
        eq(agentTaskSessions.taskId, taskId),
      ),
    )
    .limit(1)
  if (existing) {
    return existing
  }

  // Insert a new queued session
  const [session] = await db
    .insert(agentTaskSessions)
    .values({ operatorId, taskId, adapterType, status: 'queued' })
    .returning()

  // Fetch task to get workspace context
  const [task] = await db
    .select({ workspaceId: tasks.workspaceId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1)
  const workspaceId = task?.workspaceId

  // Log creation event
  try {
    await logActivity({
      workspaceId: workspaceId ?? '',
      action: 'agent_session_created',
      entityType: 'agent_task_session',
      entityId: session.id,
      actorType: 'agent',
      actorId: operatorId,
      eventFamily: 'agent',
      eventType: 'agent_session_created',
    })
  } catch (err) {
    console.error('Failed to log agent session creation', err)
  }

  return session
}

/**
 * Enqueue or coalesce an agent wakeup request for execution via heartbeat.
 */
export async function createWakeupRequest(
  operatorId: string,
  taskId: string | null,
  source: string,
  payload: unknown,
  options?: {
    triggerDetail?: string
    reason?: string
    idempotencyKey?: string
    requestedByActorType?: string
    requestedByActorId?: string
  }
) {
  // Deduplicate queued requests
  const [existing] = await db
    .select()
    .from(agentWakeupRequests)
    .where(
      and(
        eq(agentWakeupRequests.operatorId, operatorId),
        taskId !== null ? eq(agentWakeupRequests.taskId, taskId) : isNull(agentWakeupRequests.taskId),
        eq(agentWakeupRequests.status, 'queued'),
      ),
    )
    .limit(1)
  if (existing) {
    // Increment coalesced count
    await db
      .update(agentWakeupRequests)
      .set({ coalescedCount: existing.coalescedCount + 1 })
      .where(eq(agentWakeupRequests.id, existing.id))
    return
  }
  // Insert new wakeup request
  const values: typeof agentWakeupRequests.$inferInsert = {
    operatorId,
    taskId,
    source,
    payload,
    status: 'queued',
    coalescedCount: 0,
    requestedByActorType: options?.requestedByActorType,
    requestedByActorId: options?.requestedByActorId,
    idempotencyKey: options?.idempotencyKey,
    reason: options?.reason,
    triggerDetail: options?.triggerDetail,
  }
  const [request] = await db.insert(agentWakeupRequests).values(values).returning()
  // Log wakeup request event
  try {
    await logActivity({
      workspaceId: request.operatorId,
      action: 'agent_wakeup_requested',
      entityType: 'agent_wakeup_request',
      entityId: request.id,
      actorType: (options?.requestedByActorType as 'human' | 'agent' | 'system' | 'webhook') || 'system',
      actorId: options?.requestedByActorId || undefined,
      eventFamily: 'agent',
      eventType: 'agent_wakeup_requested',
    })
  } catch (err) {
    console.error('Failed to log agent wakeup request', err)
  }
}

/**
 * Mark a session as active and record checkpoint timestamp.
 */
export async function markSessionActive(sessionId: string) {
  await db
    .update(agentTaskSessions)
    .set({ status: 'active', lastCheckpointAt: new Date() })
    .where(eq(agentTaskSessions.id, sessionId))
}

/**
 * Mark a session as completed, update task status, and log event.
 */
export async function markSessionComplete(sessionId: string, summary: string) {
  // Update session
  await db
    .update(agentTaskSessions)
    .set({ status: 'completed' })
    .where(eq(agentTaskSessions.id, sessionId))

  // Fetch session to get task and operator
  const [session] = await db
    .select()
    .from(agentTaskSessions)
    .where(eq(agentTaskSessions.id, sessionId))
    .limit(1)
  if (!session) return

  // Update task status
  await db
    .update(tasks)
    .set({ status: 'Done', completionSummary: summary, completedAt: new Date() })
    .where(eq(tasks.id, session.taskId))

  // Log completion event
  const [taskRow] = await db
    .select({ workspaceId: tasks.workspaceId })
    .from(tasks)
    .where(eq(tasks.id, session.taskId))
    .limit(1)
  try {
    await logActivity({
      workspaceId: taskRow?.workspaceId ?? '',
      action: 'agent_task_completed',
      entityType: 'task',
      entityId: session.taskId,
      actorType: 'agent',
      actorId: session.operatorId,
      eventFamily: 'agent',
      eventType: 'agent_task_completed',
    })
  } catch (err) {
    console.error('Failed to log agent task completion', err)
  }
}

/**
 * Mark a session as failed and log error event.
 */
export async function markSessionFailed(sessionId: string, error: string) {
  // Update session
  await db
    .update(agentTaskSessions)
    .set({ status: 'failed', lastError: error })
    .where(eq(agentTaskSessions.id, sessionId))

  // Fetch session for context
  const [session] = await db
    .select()
    .from(agentTaskSessions)
    .where(eq(agentTaskSessions.id, sessionId))
    .limit(1)
  if (!session) return

  // Fetch workspace from task
  const [taskRow] = await db
    .select({ workspaceId: tasks.workspaceId })
    .from(tasks)
    .where(eq(tasks.id, session.taskId))
    .limit(1)
  try {
    await logActivity({
      workspaceId: taskRow?.workspaceId ?? '',
      action: 'agent_task_failed',
      entityType: 'task',
      entityId: session.taskId,
      actorType: 'agent',
      actorId: session.operatorId,
      eventFamily: 'agent',
      eventType: 'agent_task_failed',
      status: 'failed',
      description: error,
    })
  } catch (err) {
    console.error('Failed to log agent task failure', err)
  }
}

/**
 * Retrieve queued sessions with task context for an operator.
 */
export async function getQueuedSessions(operatorId: string) {
  const rows = await db
    .select({
      sessionId: agentTaskSessions.id,
      taskId: agentTaskSessions.taskId,
      adapterType: agentTaskSessions.adapterType,
      status: agentTaskSessions.status,
      lastCheckpointAt: agentTaskSessions.lastCheckpointAt,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      areaId: tasks.areaId,
      projectId: tasks.projectId,
    })
    .from(agentTaskSessions)
    .leftJoin(tasks, eq(agentTaskSessions.taskId, tasks.id))
    .where(
      and(
        eq(agentTaskSessions.operatorId, operatorId),
        eq(agentTaskSessions.status, 'queued'),
      ),
    )
  return rows
}
