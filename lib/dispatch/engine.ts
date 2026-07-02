/**
 * Dispatch engine — the main cycle (spec §5.2, Phase 2).
 *
 * Called by /api/cron/dispatch. Finds ready tasks (assigned agent + deps met +
 * operator available), atomically claims their wakeup request, creates an
 * agent_task_session, and invokes the operator's adapter to spawn the harness.
 *
 * Each cycle starts with stale-claim reclamation (Phase 3): dead claims are
 * re-queued and their slots freed before candidates are evaluated. Candidates
 * are filtered on the two canonical dispatchable statuses ONLY — toNormalized()
 * maps unknown legacy strings to 'queued' as a fallback, so trusting
 * normalization here could dispatch stray statuses (readiness re-checks this
 * via isKnownStatus as well).
 *
 * Priority order: tasks.priority text, then urgent+important flags, then age.
 * (lib/priority-engine.ts scoring needs project tiers / estimate fields the
 * tasks table doesn't carry — slot it in when that data exists.)
 */
import { db } from '@/lib/db'
import { tasks, operators, agentWakeupRequests, agentTaskSessions, taskEvents } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { evaluateReadiness } from './readiness'
import { getAdapter } from './adapters'
import { createTaskSession, createWakeupRequest, markSessionActive, markSessionFailed } from '@/lib/agent-execution'
import { logActivity } from '@/lib/activity'

export interface DispatchSummary {
  reclaimed: number
  candidates: number
  ready: number
  claimed: number
  dispatched: number
  skipped: { taskId: string; reason: string }[]
  errors: { taskId: string; error: string }[]
}

/** Spec §5.2 default for operators whose adapter is unknown/unregistered. */
const DEFAULT_STALE_THRESHOLD_MS = 15 * 60 * 1000

/**
 * Stale-claim reclamation (spec §5.2 step 1, Phase 3). A claimed/running
 * wakeup whose last sign of life — claim time or the linked session's
 * lastCheckpointAt, whichever is newer — is older than the operator adapter's
 * threshold (oneshot/delegate 5 min, tmux 30 min, unknown 15 min) is
 * considered dead: the harness crashed or never picked the task up. The
 * wakeup returns to 'queued' (so the next cycle can re-dispatch), the linked
 * session is failed, and the operator slot is freed. Everything is logged on
 * both spines as task_claim_stale_reclaimed.
 */
export async function reclaimStaleClaims(now: Date = new Date()): Promise<number> {
  const inFlight = await db
    .select()
    .from(agentWakeupRequests)
    .where(inArray(agentWakeupRequests.status, ['claimed', 'running']))
  if (inFlight.length === 0) return 0

  const operatorIds = [...new Set(inFlight.map(w => w.operatorId))]
  const operatorRows = await db.select().from(operators).where(inArray(operators.id, operatorIds))
  const operatorById = new Map(operatorRows.map(o => [o.id, o]))

  let reclaimed = 0
  for (const wakeup of inFlight) {
    const operator = operatorById.get(wakeup.operatorId)
    const adapter = operator ? getAdapter(operator.adapterType) : null
    const thresholdMs = adapter?.staleClaimThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS

    let session: typeof agentTaskSessions.$inferSelect | undefined
    if (wakeup.runId) {
      ;[session] = await db.select().from(agentTaskSessions).where(eq(agentTaskSessions.id, wakeup.runId)).limit(1)
    }
    const lastAlive = Math.max(
      wakeup.claimedAt?.getTime() ?? wakeup.requestedAt.getTime(),
      session?.lastCheckpointAt?.getTime() ?? 0,
    )
    if (now.getTime() - lastAlive < thresholdMs) continue

    // Guarded reset: only reclaim if still in a claimed/running state (a
    // harness completing between our read and this write wins the race).
    const [reset] = await db
      .update(agentWakeupRequests)
      .set({ status: 'queued', claimedAt: null, runId: null })
      .where(and(eq(agentWakeupRequests.id, wakeup.id), inArray(agentWakeupRequests.status, ['claimed', 'running'])))
      .returning()
    if (!reset) continue
    reclaimed++

    if (session && (session.status === 'active' || session.status === 'queued')) {
      await markSessionFailed(session.id, `stale claim reclaimed after ${Math.round(thresholdMs / 60000)} min without activity`)
      if (operator) {
        const [fresh] = await db.select().from(operators).where(eq(operators.id, operator.id)).limit(1)
        if (fresh) {
          await db.update(operators)
            .set({ activeRunCount: Math.max(0, fresh.activeRunCount - 1) })
            .where(eq(operators.id, fresh.id))
        }
      }
    }

    if (wakeup.taskId) {
      await db.insert(taskEvents).values({
        taskId: wakeup.taskId,
        eventType: 'task_claim_stale_reclaimed',
        actorType: 'system',
        actorName: 'dispatch-engine',
        summaryNote: `Stale claim reclaimed (no activity for ${Math.round((now.getTime() - lastAlive) / 60000)} min, threshold ${Math.round(thresholdMs / 60000)} min) — wakeup re-queued`,
        metadata: { wakeupId: wakeup.id, operatorId: wakeup.operatorId, sessionId: session?.id ?? null, thresholdMs },
      })
    }
    const [task] = wakeup.taskId
      ? await db.select({ workspaceId: tasks.workspaceId, title: tasks.title }).from(tasks).where(eq(tasks.id, wakeup.taskId)).limit(1)
      : []
    await logActivity({
      workspaceId: task?.workspaceId ?? 'personal',
      actor: 'dispatch-engine',
      action: 'task_claim_stale_reclaimed',
      entityType: 'task',
      entityId: wakeup.taskId ?? wakeup.id,
      entityTitle: task?.title ?? 'unknown task',
      description: `Stale ${wakeup.status} claim reclaimed for operator ${wakeup.operatorId}; wakeup re-queued`,
      metadata: { wakeupId: wakeup.id, operatorId: wakeup.operatorId, thresholdMs },
      actorType: 'system',
      actorName: 'dispatch-engine',
      eventFamily: 'agent',
      eventType: 'task_claim_stale_reclaimed',
      sourceSystem: 'api',
      status: 'success',
    })
  }
  return reclaimed
}

const DISPATCHABLE_LEGACY_STATUSES = ['Backlog', 'To Do']
const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

function byDispatchPriority(a: typeof tasks.$inferSelect, b: typeof tasks.$inferSelect): number {
  const pa = PRIORITY_ORDER[a.priority ?? 'medium'] ?? 2
  const pb = PRIORITY_ORDER[b.priority ?? 'medium'] ?? 2
  if (pa !== pb) return pa - pb
  const fa = (a.urgent ? 1 : 0) + (a.important ? 1 : 0)
  const fb = (b.urgent ? 1 : 0) + (b.important ? 1 : 0)
  if (fa !== fb) return fb - fa
  return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
}

/**
 * Atomically claim a task's queued wakeup request. If the task has none (it was
 * assigned before the wakeup queue existed, or the previous one finished), a
 * fresh one is enqueued first — the cycle is the reconciler, wakeups are the
 * audit trail. Returns null if another dispatcher won the claim race.
 */
async function claimWakeup(task: typeof tasks.$inferSelect) {
  let [queued] = await db
    .select()
    .from(agentWakeupRequests)
    .where(and(eq(agentWakeupRequests.taskId, task.id), eq(agentWakeupRequests.status, 'queued')))
    .limit(1)

  if (!queued) {
    const created = await createWakeupRequest(
      task.assigneeId!,
      task.id,
      'dispatch_cycle',
      { task: { id: task.id, title: task.title } },
      {
        triggerDetail: 'Enqueued by dispatch cycle (ready task had no queued wakeup)',
        reason: 'dispatch_cycle',
        requestedByActorType: 'system',
        idempotencyKey: task.id,
      },
    )
    if (!created?.request) return null
    queued = created.request
  }

  const [claimed] = await db
    .update(agentWakeupRequests)
    .set({ status: 'claimed', claimedAt: new Date() })
    .where(and(eq(agentWakeupRequests.id, queued.id), eq(agentWakeupRequests.status, 'queued')))
    .returning()
  return claimed ?? null
}

/**
 * Settle the dispatch footprint when a task reaches a terminal status (Done /
 * Cancelled): close its live sessions, complete its in-flight wakeups, and
 * free the operator concurrency slots the engine claimed at dispatch time.
 * Nothing else decrements active_run_count in Phase 2 (fire-and-forget
 * adapters can't observe completion; stale reclamation is Phase 3), so this
 * hook — called from the task PATCH route before the cascade — is what keeps
 * operators from starving at max_concurrent. Never throws.
 */
export async function settleDispatchOnTerminal(taskId: string): Promise<void> {
  try {
    const liveSessions = await db
      .select()
      .from(agentTaskSessions)
      .where(and(eq(agentTaskSessions.taskId, taskId), inArray(agentTaskSessions.status, ['active', 'queued'])))
    for (const session of liveSessions) {
      await db.update(agentTaskSessions)
        .set({ status: 'completed' })
        .where(eq(agentTaskSessions.id, session.id))
      const [operator] = await db.select().from(operators).where(eq(operators.id, session.operatorId)).limit(1)
      if (operator) {
        await db.update(operators)
          .set({ activeRunCount: Math.max(0, operator.activeRunCount - 1) })
          .where(eq(operators.id, operator.id))
      }
    }
    await db.update(agentWakeupRequests)
      .set({ status: 'completed', finishedAt: new Date() })
      .where(and(eq(agentWakeupRequests.taskId, taskId), inArray(agentWakeupRequests.status, ['claimed', 'running'])))
  } catch (err) {
    console.error('[settleDispatchOnTerminal]', taskId, err)
  }
}

export async function runDispatchCycle(): Promise<DispatchSummary> {
  const summary: DispatchSummary = { reclaimed: 0, candidates: 0, ready: 0, claimed: 0, dispatched: 0, skipped: [], errors: [] }

  // 0. Reclaim dead claims first so their slots/wakeups are visible below.
  try {
    summary.reclaimed = await reclaimStaleClaims()
  } catch (err) {
    console.error('[runDispatchCycle] stale reclamation failed', err)
  }

  // 1. Candidate tasks: dispatchable status + agent/function assignee.
  const candidates = await db
    .select()
    .from(tasks)
    .where(and(
      inArray(tasks.status, DISPATCHABLE_LEGACY_STATUSES),
      inArray(tasks.assigneeType, ['agent', 'function']),
    ))
  summary.candidates = candidates.length
  if (candidates.length === 0) return summary

  // 2. Readiness filter.
  const ready: typeof candidates = []
  for (const task of candidates) {
    const readiness = await evaluateReadiness(task.id)
    if (readiness.ready) {
      ready.push(task)
    } else {
      summary.skipped.push({ taskId: task.id, reason: readiness.blockers.join('; ') })
    }
  }
  summary.ready = ready.length
  if (ready.length === 0) return summary

  // 3. Priority order + per-operator concurrency budget for THIS cycle
  //    (readiness saw active_run_count as of its own query; track increments here).
  ready.sort(byDispatchPriority)
  const operatorIds = [...new Set(ready.map(t => t.assigneeId!))]
  const operatorRows = await db.select().from(operators).where(inArray(operators.id, operatorIds))
  const operatorById = new Map(operatorRows.map(o => [o.id, o]))
  const runCounts = new Map(operatorRows.map(o => [o.id, o.activeRunCount]))

  for (const task of ready) {
    const operator = operatorById.get(task.assigneeId!)
    if (!operator) continue
    const adapter = getAdapter(operator.adapterType)
    if (!adapter) {
      summary.skipped.push({ taskId: task.id, reason: `adapter "${operator.adapterType}" not registered` })
      continue
    }
    if ((runCounts.get(operator.id) ?? 0) >= operator.maxConcurrent) {
      summary.skipped.push({ taskId: task.id, reason: `operator "${operator.id}" at max concurrency this cycle` })
      continue
    }

    try {
      // 4. Atomic claim (UPDATE ... WHERE status='queued' RETURNING).
      const wakeup = await claimWakeup(task)
      if (!wakeup) {
        summary.skipped.push({ taskId: task.id, reason: 'wakeup claim lost (raced another dispatcher)' })
        continue
      }
      summary.claimed++

      // 5. Session + run count. createTaskSession returns any existing row for
      //    (operator, task) — a completed/failed one from a previous run is
      //    reactivated, since readiness already proved no live session exists.
      const session = await createTaskSession(task.id, operator.id, adapter.type)
      if (session.status !== 'active') await markSessionActive(session.id)
      await db.update(agentWakeupRequests).set({ runId: session.id }).where(eq(agentWakeupRequests.id, wakeup.id))
      await db.update(operators)
        .set({ activeRunCount: (runCounts.get(operator.id) ?? 0) + 1 })
        .where(eq(operators.id, operator.id))
      runCounts.set(operator.id, (runCounts.get(operator.id) ?? 0) + 1)

      // 6. Spawn the harness.
      const result = await adapter.dispatch(task, operator, wakeup)

      if (result.status === 'failed') {
        await markSessionFailed(session.id, result.detail)
        await db.update(agentWakeupRequests)
          .set({ status: 'failed', error: result.detail, finishedAt: new Date() })
          .where(eq(agentWakeupRequests.id, wakeup.id))
        await db.update(operators)
          .set({ activeRunCount: Math.max(0, (runCounts.get(operator.id) ?? 1) - 1) })
          .where(eq(operators.id, operator.id))
        runCounts.set(operator.id, Math.max(0, (runCounts.get(operator.id) ?? 1) - 1))
        summary.errors.push({ taskId: task.id, error: result.detail })
        continue
      }

      await db.update(agentWakeupRequests)
        .set({ status: 'running' })
        .where(eq(agentWakeupRequests.id, wakeup.id))
      await db.update(agentTaskSessions)
        .set({ sessionDisplayId: result.sessionId })
        .where(eq(agentTaskSessions.id, session.id))
      summary.dispatched++

      // 7. Observability: structured task_event + canonical activity_log.
      await db.insert(taskEvents).values({
        taskId: task.id,
        eventType: 'task_dispatched',
        actorType: 'system',
        actorName: 'dispatch-engine',
        summaryNote: `Dispatched to ${operator.id} via ${adapter.type}: ${result.detail}`,
        metadata: { operatorId: operator.id, adapterType: adapter.type, harnessSessionId: result.sessionId, wakeupId: wakeup.id },
      })
      await logActivity({
        workspaceId: task.workspaceId,
        actor: 'dispatch-engine',
        action: 'task_dispatched',
        entityType: 'task',
        entityId: task.id,
        entityTitle: task.title,
        description: `"${task.title}" dispatched to ${operator.id} via ${adapter.type}`,
        metadata: { operatorId: operator.id, adapterType: adapter.type, harnessSessionId: result.sessionId },
        actorType: 'system',
        actorName: 'dispatch-engine',
        eventFamily: 'agent',
        eventType: 'task_dispatched',
        sourceSystem: 'api',
        status: 'success',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      summary.errors.push({ taskId: task.id, error: message })
      console.error('[runDispatchCycle]', task.id, err)
    }
  }

  return summary
}
