/**
 * Probe P3.4 — stale-claim reclamation with per-adapter thresholds.
 *
 * Against live Neon (namespaced [E2E-TEST] rows, deleted in finally):
 *  1. oneshot claim aged 7 min (threshold 5) → reclaimed: wakeup re-queued,
 *     session failed, operator slot freed, both log spines written.
 *  2. oneshot claim aged 4 min → untouched (boundary guard).
 *  3. claude-tmux claim aged 7 min (threshold 30) → untouched.
 *  4. oneshot claim aged 7 min but session checkpointed 1 min ago → untouched
 *     (an actively-checkpointing harness is alive, whatever the claim age).
 */
import { check, finish, TEST_PREFIX } from './_probe-env'

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, operators, agentWakeupRequests, agentTaskSessions, taskEvents, activityLog } = await import('@/lib/db/schema')
  const { reclaimStaleClaims } = await import('@/lib/dispatch/engine')
  const { eq, like, inArray } = await import('drizzle-orm')

  const now = Date.now()
  const min = (n: number) => new Date(now - n * 60_000)
  const opIds = ['probe-stale-oneshot', 'probe-stale-tmux']
  const taskIds: string[] = []

  try {
    await db.insert(operators).values([
      { id: opIds[0], name: `${TEST_PREFIX} stale oneshot op`, operatorType: 'agent', status: 'active', adapterType: 'hermes-oneshot', maxConcurrent: 3, activeRunCount: 2 },
      { id: opIds[1], name: `${TEST_PREFIX} stale tmux op`, operatorType: 'agent', status: 'active', adapterType: 'claude-tmux', maxConcurrent: 1, activeRunCount: 1 },
    ])

    async function scenario(title: string, operatorId: string, claimedMinAgo: number, checkpointMinAgo: number) {
      const [task] = await db.insert(tasks).values({
        workspaceId: 'personal', title: `${TEST_PREFIX} ${title}`, status: 'To Do',
        assigneeType: 'agent', assigneeId: operatorId, sourceType: 'api',
      }).returning()
      taskIds.push(task.id)
      const [session] = await db.insert(agentTaskSessions).values({
        operatorId, taskId: task.id, adapterType: 'probe', status: 'active',
        lastCheckpointAt: min(checkpointMinAgo),
      }).returning()
      const [wakeup] = await db.insert(agentWakeupRequests).values({
        operatorId, taskId: task.id, source: 'manual', payload: {}, status: 'claimed',
        claimedAt: min(claimedMinAgo), runId: session.id,
      }).returning()
      return { task, session, wakeup }
    }

    const stale = await scenario('stale oneshot 7min', opIds[0], 7, 7)
    const young = await scenario('young oneshot 4min', opIds[0], 4, 4)
    const tmux = await scenario('tmux 7min under 30min threshold', opIds[1], 7, 7)
    const alive = await scenario('oneshot old claim fresh checkpoint', opIds[0], 7, 1)

    const reclaimed = await reclaimStaleClaims()
    check('exactly one claim reclaimed', reclaimed === 1, `reclaimed=${reclaimed}`)

    const [staleWakeup] = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.id, stale.wakeup.id))
    check('stale wakeup re-queued', staleWakeup.status === 'queued' && staleWakeup.claimedAt === null && staleWakeup.runId === null,
      JSON.stringify({ status: staleWakeup.status, claimedAt: staleWakeup.claimedAt, runId: staleWakeup.runId }))
    const [staleSession] = await db.select().from(agentTaskSessions).where(eq(agentTaskSessions.id, stale.session.id))
    check('stale session failed', staleSession.status === 'failed', staleSession.status)
    const [op0] = await db.select().from(operators).where(eq(operators.id, opIds[0]))
    check('operator slot freed (2→1)', op0.activeRunCount === 1, String(op0.activeRunCount))

    const events = await db.select().from(taskEvents).where(eq(taskEvents.taskId, stale.task.id))
    check('task_claim_stale_reclaimed event written', events.some(e => e.eventType === 'task_claim_stale_reclaimed'),
      events.map(e => e.eventType).join(','))
    const activity = await db.select().from(activityLog).where(eq(activityLog.entityId, stale.task.id))
    check('activity_log spine written', activity.some(a => a.action === 'task_claim_stale_reclaimed'),
      activity.map(a => a.action).join(','))

    for (const [label, sc] of [['young', young], ['tmux', tmux], ['alive-checkpoint', alive]] as const) {
      const [w] = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.id, sc.wakeup.id))
      const [s] = await db.select().from(agentTaskSessions).where(eq(agentTaskSessions.id, sc.session.id))
      check(`${label} claim untouched`, w.status === 'claimed' && s.status === 'active', `wakeup=${w.status} session=${s.status}`)
    }
  } finally {
    if (taskIds.length) {
      await db.delete(agentWakeupRequests).where(inArray(agentWakeupRequests.taskId, taskIds))
      await db.delete(agentTaskSessions).where(inArray(agentTaskSessions.taskId, taskIds))
      await db.delete(taskEvents).where(inArray(taskEvents.taskId, taskIds))
      await db.delete(activityLog).where(inArray(activityLog.entityId, taskIds))
      await db.delete(tasks).where(inArray(tasks.id, taskIds))
    }
    await db.delete(operators).where(inArray(operators.id, opIds))
    const residueTasks = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    const residueOps = await db.select({ id: operators.id }).from(operators).where(like(operators.name, `${TEST_PREFIX}%`))
    check('residual test rows = 0', residueTasks.length === 0 && residueOps.length === 0,
      `tasks=${residueTasks.length} operators=${residueOps.length}`)
  }
  finish('probe P3.4')
}

main().catch((err) => { console.error(err); process.exit(1) })
