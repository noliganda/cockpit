import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, operators, agentWakeupRequests, agentTaskSessions, dispatchState } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { getSessionData } from '@/lib/auth'
import { getAdapter } from '@/lib/dispatch/adapters'
import { apiHandler } from '@/lib/api-handler'

// ── Dispatch status (spec §6.4) ──────────────────────────────────────────────
// Monitoring surface for the PM session and the dashboard panel: cycle
// watermarks, agent operators with live run counts, the wakeup queue, in-flight
// claims flagged stale against their adapter's threshold, and active sessions.
// Read-only. Auth: bearer or dashboard session; guests are 403'd (operator
// budget/pause state is not guest-visible).

const DEFAULT_STALE_THRESHOLD_MS = 15 * 60 * 1000

export const GET = apiHandler(async () => {
  const sessionData = await getSessionData()
  if (!sessionData) {
    return NextResponse.json(
      { error: 'Not authenticated. Send Authorization: Bearer $COCKPIT_API_TOKEN.', code: 'unauthorized' },
      { status: 401 },
    )
  }
  if (sessionData.role === 'guest') {
    return NextResponse.json({ error: 'Guests cannot read dispatch status.', code: 'forbidden' }, { status: 403 })
  }

  const now = Date.now()
  const [state] = await db.select().from(dispatchState).where(eq(dispatchState.id, 'singleton')).limit(1)

  const agentOperators = await db
    .select()
    .from(operators)
    .where(inArray(operators.operatorType, ['agent', 'function']))

  const inFlightOrQueued = await db
    .select()
    .from(agentWakeupRequests)
    .where(inArray(agentWakeupRequests.status, ['queued', 'claimed', 'running']))

  const activeSessions = await db
    .select()
    .from(agentTaskSessions)
    .where(inArray(agentTaskSessions.status, ['active', 'queued']))

  const taskIds = [...new Set([
    ...inFlightOrQueued.map(w => w.taskId).filter((id): id is string => !!id),
    ...activeSessions.map(s => s.taskId),
  ])]
  const taskRows = taskIds.length
    ? await db.select({ id: tasks.id, title: tasks.title, status: tasks.status, workspaceId: tasks.workspaceId }).from(tasks).where(inArray(tasks.id, taskIds))
    : []
  const taskById = new Map(taskRows.map(t => [t.id, t]))
  const operatorById = new Map(agentOperators.map(o => [o.id, o]))
  const sessionById = new Map(activeSessions.map(s => [s.id, s]))

  const queue = inFlightOrQueued.map((w) => {
    const operator = operatorById.get(w.operatorId)
    const adapter = operator ? getAdapter(operator.adapterType) : null
    const thresholdMs = adapter?.staleClaimThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS
    const session = w.runId ? sessionById.get(w.runId) : undefined
    const lastAlive = Math.max(
      w.claimedAt?.getTime() ?? w.requestedAt.getTime(),
      session?.lastCheckpointAt?.getTime() ?? 0,
    )
    const idleMs = now - lastAlive
    return {
      id: w.id,
      status: w.status,
      source: w.source,
      operatorId: w.operatorId,
      taskId: w.taskId,
      task: w.taskId ? taskById.get(w.taskId) ?? null : null,
      requestedAt: w.requestedAt,
      claimedAt: w.claimedAt,
      idleMs,
      staleThresholdMs: thresholdMs,
      isStale: (w.status === 'claimed' || w.status === 'running') && idleMs >= thresholdMs,
    }
  })

  return NextResponse.json({
    dispatchEnabled: process.env.DISPATCH_ENABLED === 'true',
    state: {
      lastCycleAt: state?.lastCycleAt ?? null,
      lastCascadeAt: state?.lastCascadeAt ?? null,
      paused: state?.paused ?? false,
      pausedAt: state?.pausedAt ?? null,
      pausedBy: state?.pausedBy ?? null,
    },
    operators: agentOperators.map(o => ({
      id: o.id,
      name: o.name,
      status: o.status,
      pauseReason: o.pauseReason,
      adapterType: o.adapterType,
      adapterRegistered: !!getAdapter(o.adapterType),
      maxConcurrent: o.maxConcurrent,
      activeRunCount: o.activeRunCount,
      budgetMonthlyCents: o.budgetMonthlyCents,
      spentMonthlyCents: o.spentMonthlyCents,
    })),
    queue: {
      counts: {
        queued: queue.filter(q => q.status === 'queued').length,
        claimed: queue.filter(q => q.status === 'claimed').length,
        running: queue.filter(q => q.status === 'running').length,
      },
      items: queue,
    },
    staleClaims: queue.filter(q => q.isStale),
    activeSessions: activeSessions.map(s => ({
      id: s.id,
      operatorId: s.operatorId,
      taskId: s.taskId,
      task: taskById.get(s.taskId) ?? null,
      adapterType: s.adapterType,
      sessionDisplayId: s.sessionDisplayId,
      lastCheckpointAt: s.lastCheckpointAt,
    })),
  })
})
