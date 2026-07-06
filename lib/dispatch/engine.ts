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
import { tasks, operators, agentWakeupRequests, agentTaskSessions, taskEvents, taskDependencies, dispatchState } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { evaluateReadiness } from './readiness'
import { getAdapter, type DispatchContext } from './adapters'
import { toNormalized, isKnownStatus } from '@/lib/task-lifecycle'
import { createTaskSession, createWakeupRequest, markSessionActive, markSessionFailed } from '@/lib/agent-execution'
import { logActivity } from '@/lib/activity'

export interface DispatchSummary {
  /** True when the soft pause stopped this cycle after reclamation. */
  paused?: boolean
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
 * Soft pause (migration 0011): DB-backed so the dashboard can stop dispatching
 * on every host without touching env vars. Pause means "start no new work" —
 * stale reclamation and cascade bookkeeping continue.
 */
export async function isDispatchPaused(): Promise<boolean> {
  const [state] = await db.select({ paused: dispatchState.paused }).from(dispatchState).where(eq(dispatchState.id, 'singleton')).limit(1)
  return state?.paused ?? false
}

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
    // Task-level activity counts as liveness: oneshot harnesses never
    // checkpoint their session — they prove life through task events (which
    // bump tasks.last_activity_at). Ignoring it reclaimed live runs mid-flight
    // and leaked their re-queued wakeups (2026-07-06 stuck-queue incident).
    const [taskAlive] = wakeup.taskId
      ? await db.select({ lastActivityAt: tasks.lastActivityAt }).from(tasks).where(eq(tasks.id, wakeup.taskId)).limit(1)
      : []
    const lastAlive = Math.max(
      wakeup.claimedAt?.getTime() ?? wakeup.requestedAt.getTime(),
      session?.lastCheckpointAt?.getTime() ?? 0,
      taskAlive?.lastActivityAt?.getTime() ?? 0,
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
    // Queued wakeups are cancelled, not completed: the task reached a terminal
    // status without them ever being consumed (e.g. stale reclamation re-queued
    // one mid-run). Leaving them 'queued' is how the dispatch queue showed
    // long-Done tasks as stuck.
    await db.update(agentWakeupRequests)
      .set({ status: 'cancelled', finishedAt: new Date() })
      .where(and(eq(agentWakeupRequests.taskId, taskId), eq(agentWakeupRequests.status, 'queued')))
  } catch (err) {
    console.error('[settleDispatchOnTerminal]', taskId, err)
  }
}

/**
 * Reconciler for leaked dispatch footprints: any open wakeup whose task is
 * already terminal gets settled through settleDispatchOnTerminal. Covers every
 * path that skips the task-PATCH hook (direct DB status writes, historical
 * leaks). Runs at the top of every cycle, including paused ones — pause means
 * "start no new work", bookkeeping always continues. Never throws.
 */
export async function reconcileTerminalWakeups(): Promise<number> {
  try {
    const open = await db
      .select({ taskId: agentWakeupRequests.taskId, taskStatus: tasks.status, taskTitle: tasks.title, workspaceId: tasks.workspaceId })
      .from(agentWakeupRequests)
      .innerJoin(tasks, eq(agentWakeupRequests.taskId, tasks.id))
      .where(inArray(agentWakeupRequests.status, ['queued', 'claimed', 'running']))
    const terminal = open.filter((r) => {
      const norm = toNormalized(r.taskStatus)
      return norm === 'done' || norm === 'cancelled'
    })
    const byTask = new Map(terminal.map((r) => [r.taskId!, r]))
    for (const [taskId, row] of byTask) {
      await settleDispatchOnTerminal(taskId)
      await logActivity({
        workspaceId: row.workspaceId,
        actor: 'dispatch-engine',
        action: 'wakeup_reconciled',
        entityType: 'task',
        entityId: taskId,
        entityTitle: row.taskTitle,
        description: `Open wakeup settled for already-${toNormalized(row.taskStatus)} task "${row.taskTitle}"`,
        actorType: 'system',
        actorName: 'dispatch-engine',
        eventFamily: 'agent',
        eventType: 'dispatch_wakeup_reconciled',
        sourceSystem: 'api',
        status: 'success',
      })
    }
    return byTask.size
  } catch (err) {
    console.error('[reconcileTerminalWakeups]', err)
    return 0
  }
}

export async function runDispatchCycle(): Promise<DispatchSummary> {
  const summary: DispatchSummary = { reclaimed: 0, candidates: 0, ready: 0, claimed: 0, dispatched: 0, skipped: [], errors: [] }

  // 0a. Settle open wakeups on already-terminal tasks BEFORE reclamation, so
  //     a finished task's claimed wakeup completes instead of being re-queued.
  await reconcileTerminalWakeups()

  // 0. Reclaim dead claims first so their slots/wakeups are visible below.
  try {
    summary.reclaimed = await reclaimStaleClaims()
  } catch (err) {
    console.error('[runDispatchCycle] stale reclamation failed', err)
  }

  // 0b. Soft pause: reclamation ran (it starts nothing), but no new dispatches.
  if (await isDispatchPaused()) {
    summary.paused = true
    return summary
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

  // 3. Priority order, then dispatch one by one. dispatchTaskById re-reads the
  //    operator each time, so active_run_count increments from earlier tasks in
  //    this same cycle are visible to later concurrency checks.
  ready.sort(byDispatchPriority)
  for (const task of ready) {
    try {
      const outcome = await dispatchTaskById(task.id, { skipReadinessCheck: true })
      if (outcome.claimed) summary.claimed++
      if (outcome.outcome === 'dispatched') {
        summary.dispatched++
      } else if (outcome.outcome === 'failed') {
        summary.errors.push({ taskId: task.id, error: outcome.reason })
      } else {
        summary.skipped.push({ taskId: task.id, reason: outcome.reason })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      summary.errors.push({ taskId: task.id, error: message })
      console.error('[runDispatchCycle]', task.id, err)
    }
  }

  return summary
}

export interface DispatchOutcome {
  outcome: 'dispatched' | 'skipped' | 'failed'
  reason: string
  /** Not-ready blockers when the readiness check rejected the task. */
  blockers?: string[]
  /** Whether a wakeup claim was consumed (even if the spawn then failed). */
  claimed?: boolean
  harnessSessionId?: string
  adapterType?: string
  operatorId?: string
}

/**
 * Dispatch a single task — shared by the cycle loop and the manual trigger
 * (spec §6.2). Hard guards hold even under force=true: the task must exist,
 * carry a recognized non-terminal, non-in-progress status, have no live
 * session, and its operator must exist with a registered adapter and a free
 * concurrency slot. force ONLY bypasses the evaluateReadiness() gate
 * (dependencies, operator active/budget state) — "force" must never mean
 * "double-dispatch".
 *
 * Before spawning, satisfied needs_artifact prerequisites are resolved into
 * the adapter prompt context (spec §8 Phase 4) so the harness starts from its
 * inputs.
 */
export async function dispatchTaskById(
  taskId: string,
  opts: { force?: boolean; skipReadinessCheck?: boolean; actorName?: string } = {},
): Promise<DispatchOutcome> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
  if (!task) return { outcome: 'skipped', reason: 'task not found' }

  // Hard guards — force does not bypass these.
  if (!isKnownStatus(task.status)) {
    return { outcome: 'skipped', reason: `status "${task.status}" is not recognized as dispatchable` }
  }
  const normalized = toNormalized(task.status)
  if (normalized === 'in_progress' || normalized === 'done' || normalized === 'cancelled') {
    return { outcome: 'skipped', reason: `status "${task.status}" is ${normalized === 'in_progress' ? 'already in progress' : 'terminal'}` }
  }
  if (!task.assigneeId || !['agent', 'function'].includes(task.assigneeType ?? '')) {
    return { outcome: 'skipped', reason: 'not assigned to an agent or function operator' }
  }
  const liveSessions = await db
    .select({ id: agentTaskSessions.id })
    .from(agentTaskSessions)
    .where(and(eq(agentTaskSessions.taskId, taskId), inArray(agentTaskSessions.status, ['active', 'queued'])))
    .limit(1)
  if (liveSessions.length > 0) {
    return { outcome: 'skipped', reason: 'task already has an active session' }
  }

  // Soft pause blocks manual dispatch too, unless explicitly forced.
  if (!opts.force && (await isDispatchPaused())) {
    return { outcome: 'skipped', reason: 'dispatching is paused (resume from /dispatch or force)' }
  }

  if (!opts.force && !opts.skipReadinessCheck) {
    const readiness = await evaluateReadiness(taskId)
    if (!readiness.ready) {
      return { outcome: 'skipped', reason: 'not ready', blockers: readiness.blockers }
    }
  }

  const [operator] = await db.select().from(operators).where(eq(operators.id, task.assigneeId)).limit(1)
  if (!operator) return { outcome: 'skipped', reason: `operator "${task.assigneeId}" is not registered` }
  const adapter = getAdapter(operator.adapterType)
  if (!adapter) return { outcome: 'skipped', reason: `adapter "${operator.adapterType}" not registered` }
  if (operator.activeRunCount >= operator.maxConcurrent) {
    return { outcome: 'skipped', reason: `operator "${operator.id}" at max concurrency (${operator.activeRunCount}/${operator.maxConcurrent})` }
  }

  // Atomic claim (UPDATE ... WHERE status='queued' RETURNING).
  const wakeup = await claimWakeup(task)
  if (!wakeup) {
    return { outcome: 'skipped', reason: 'wakeup claim lost (raced another dispatcher)' }
  }

  // Session + run count. createTaskSession returns any existing row for
  // (operator, task) — a completed/failed one from a previous run is
  // reactivated, since the live-session guard above proved none is active.
  const session = await createTaskSession(task.id, operator.id, adapter.type)
  if (session.status !== 'active') await markSessionActive(session.id)
  await db.update(agentWakeupRequests).set({ runId: session.id }).where(eq(agentWakeupRequests.id, wakeup.id))
  await db.update(operators)
    .set({ activeRunCount: operator.activeRunCount + 1 })
    .where(eq(operators.id, operator.id))

  // Spawn the harness, with prerequisite artifacts in context.
  const context = await resolveArtifactContext(task.id)
  const result = await adapter.dispatch(task, operator, wakeup, context)

  if (result.status === 'failed') {
    await markSessionFailed(session.id, result.detail)
    await db.update(agentWakeupRequests)
      .set({ status: 'failed', error: result.detail, finishedAt: new Date() })
      .where(eq(agentWakeupRequests.id, wakeup.id))
    const [fresh] = await db.select().from(operators).where(eq(operators.id, operator.id)).limit(1)
    if (fresh) {
      await db.update(operators)
        .set({ activeRunCount: Math.max(0, fresh.activeRunCount - 1) })
        .where(eq(operators.id, fresh.id))
    }
    return { outcome: 'failed', reason: result.detail, claimed: true, adapterType: adapter.type, operatorId: operator.id }
  }

  await db.update(agentWakeupRequests)
    .set({ status: 'running' })
    .where(eq(agentWakeupRequests.id, wakeup.id))
  await db.update(agentTaskSessions)
    .set({ sessionDisplayId: result.sessionId })
    .where(eq(agentTaskSessions.id, session.id))

  // Observability: structured task_event + canonical activity_log.
  const actorName = opts.actorName ?? 'dispatch-engine'
  const forcedNote = opts.force ? ' (forced — readiness bypassed)' : ''
  await db.insert(taskEvents).values({
    taskId: task.id,
    eventType: 'task_dispatched',
    actorType: 'system',
    actorName,
    summaryNote: `Dispatched to ${operator.id} via ${adapter.type}${forcedNote}: ${result.detail}`,
    metadata: { operatorId: operator.id, adapterType: adapter.type, harnessSessionId: result.sessionId, wakeupId: wakeup.id, forced: !!opts.force },
  })
  await logActivity({
    workspaceId: task.workspaceId,
    actor: actorName,
    action: 'task_dispatched',
    entityType: 'task',
    entityId: task.id,
    entityTitle: task.title,
    description: `"${task.title}" dispatched to ${operator.id} via ${adapter.type}${forcedNote}`,
    metadata: { operatorId: operator.id, adapterType: adapter.type, harnessSessionId: result.sessionId, forced: !!opts.force },
    actorType: 'system',
    actorName,
    eventFamily: 'agent',
    eventType: 'task_dispatched',
    sourceSystem: 'api',
    status: 'success',
  })

  return {
    outcome: 'dispatched',
    reason: result.detail,
    claimed: true,
    harnessSessionId: result.sessionId,
    adapterType: adapter.type,
    operatorId: operator.id,
  }
}

/**
 * Satisfied needs_artifact prerequisites → prompt context (spec §8 Phase 4).
 * Readiness already required these to be Done WITH an artifactUrl; unfinished
 * ones (possible under force) are simply omitted.
 */
async function resolveArtifactContext(taskId: string): Promise<DispatchContext | undefined> {
  const edges = await db
    .select()
    .from(taskDependencies)
    .where(and(
      eq(taskDependencies.dependentTaskId, taskId),
      eq(taskDependencies.dependencyType, 'needs_artifact'),
    ))
  if (edges.length === 0) return undefined
  const prereqs = await db
    .select({ id: tasks.id, title: tasks.title, artifactUrl: tasks.artifactUrl })
    .from(tasks)
    .where(inArray(tasks.id, edges.map(e => e.prerequisiteTaskId)))
  const artifacts = prereqs
    .filter((p): p is typeof p & { artifactUrl: string } => !!p.artifactUrl)
    .map(p => ({ title: p.title, artifactUrl: p.artifactUrl }))
  return artifacts.length > 0 ? { artifacts } : undefined
}
