/**
 * Probe P4.8 — wakeup bookkeeping can't leak "stuck queue" rows.
 *
 * Reproduces the 2026-07-06 incident: three Done tasks' wakeups sat 'queued'
 * for 60+ hours because (a) stale reclamation ignored task-level activity and
 * killed live oneshot runs, re-queuing their wakeups, and (b) nothing settles
 * a queued wakeup once its task reaches a terminal status.
 *
 * 1. Liveness: a claimed wakeup whose TASK saw activity recently is NOT
 *    reclaimed (oneshot harnesses prove life via task events, not session
 *    checkpoints); once task activity is also stale, it IS reclaimed.
 * 2. settleDispatchOnTerminal cancels queued wakeups (not just claimed/running).
 * 3. The dispatch cycle reconciles leaked open wakeups on terminal tasks —
 *    even while the engine is paused (bookkeeping continues during pause).
 * finally: restore pause state, delete fixtures, residual 0.
 */
import { check, finish, TEST_PREFIX } from './_probe-env'

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, operators, agentWakeupRequests, agentTaskSessions, taskEvents, activityLog, dispatchState } = await import('@/lib/db/schema')
  const { reclaimStaleClaims, settleDispatchOnTerminal, runDispatchCycle } = await import('@/lib/dispatch/engine')
  const { eq, and, inArray, like, sql } = await import('drizzle-orm')

  const opId = 'probe-p48-op'
  const taskIds: string[] = []
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60000)

  // Snapshot + force pause: this probe runs real engine functions and must
  // never let the live poller race it. Restored in finally (p45 discipline).
  const [initial] = await db.select().from(dispatchState).where(eq(dispatchState.id, 'singleton')).limit(1)
  const initialPause = { paused: initial?.paused ?? false, pausedAt: initial?.pausedAt ?? null, pausedBy: initial?.pausedBy ?? null }
  await db.update(dispatchState).set({ paused: true, pausedAt: new Date(), pausedBy: 'probe-p48' }).where(eq(dispatchState.id, 'singleton'))

  try {
    await db.insert(operators).values({
      id: opId, name: `${TEST_PREFIX} p48 op`, operatorType: 'agent', status: 'active',
      adapterType: 'hermes-oneshot', dispatchConfig: {}, maxConcurrent: 1, activeRunCount: 0,
    })

    // ── 1. Liveness: task activity keeps a claimed wakeup alive ──────────
    const [liveTask] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} p48 live oneshot`, status: 'In Progress',
      assigneeType: 'agent', assigneeId: opId, sourceType: 'api', lastActivityAt: new Date(),
    }).returning()
    taskIds.push(liveTask.id)
    const [liveWakeup] = await db.insert(agentWakeupRequests).values({
      operatorId: opId, taskId: liveTask.id, source: 'dispatch_cycle', payload: {},
      status: 'claimed', claimedAt: minutesAgo(20), requestedAt: minutesAgo(20),
    }).returning()

    await reclaimStaleClaims()
    let [w] = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.id, liveWakeup.id))
    check('recent task activity blocks stale reclaim (oneshot liveness)', w.status === 'claimed', w.status)

    await db.update(tasks).set({ lastActivityAt: minutesAgo(20) }).where(eq(tasks.id, liveTask.id))
    await reclaimStaleClaims()
    ;[w] = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.id, liveWakeup.id))
    check('fully-stale claim still reclaimed (regression guard)', w.status === 'queued', w.status)

    // ── 2. Terminal settle cancels queued wakeups ─────────────────────────
    await db.update(tasks).set({ status: 'Done' }).where(eq(tasks.id, liveTask.id))
    await settleDispatchOnTerminal(liveTask.id)
    ;[w] = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.id, liveWakeup.id))
    check('terminal settle cancels the queued wakeup', w.status === 'cancelled' && w.finishedAt !== null, w.status)

    // ── 3. Cycle reconciles leaked wakeups, even paused ───────────────────
    const [doneTask] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} p48 leaked done`, status: 'Done',
      assigneeType: 'agent', assigneeId: opId, sourceType: 'api',
    }).returning()
    taskIds.push(doneTask.id)
    const [leaked] = await db.insert(agentWakeupRequests).values({
      operatorId: opId, taskId: doneTask.id, source: 'dispatch_cycle', payload: {},
      status: 'queued', requestedAt: minutesAgo(60 * 60),
    }).returning()

    const cycle = await runDispatchCycle()
    check('cycle honoured the pause', cycle.paused === true && cycle.dispatched === 0, JSON.stringify(cycle))
    const [g] = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.id, leaked.id))
    check('paused cycle still reconciled the leaked queued wakeup', g.status === 'cancelled' && g.finishedAt !== null, g.status)
  } finally {
    await db.update(dispatchState).set(initialPause).where(eq(dispatchState.id, 'singleton'))
    if (taskIds.length) {
      await db.delete(agentWakeupRequests).where(inArray(agentWakeupRequests.taskId, taskIds))
      await db.delete(agentTaskSessions).where(inArray(agentTaskSessions.taskId, taskIds))
      await db.delete(taskEvents).where(inArray(taskEvents.taskId, taskIds))
      await db.delete(activityLog).where(inArray(activityLog.entityId, taskIds))
      await db.delete(tasks).where(inArray(tasks.id, taskIds))
    }
    await db.delete(agentWakeupRequests).where(eq(agentWakeupRequests.operatorId, opId))
    await db.delete(operators).where(eq(operators.id, opId))
    await db.delete(activityLog).where(sql`${activityLog.entityTitle} LIKE ${TEST_PREFIX + '%'}`)
    const residue = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    check('residual test rows = 0', residue.length === 0, String(residue.length))
    const { isDispatchPaused } = await import('@/lib/dispatch/engine')
    check('ops pause state restored to entry value', (await isDispatchPaused()) === initialPause.paused, `expected ${initialPause.paused}`)
  }
  finish('probe P4.8 wakeup terminal settle')
}

main().catch((err) => { console.error(err); process.exit(1) })
