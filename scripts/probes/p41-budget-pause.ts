/**
 * Probe P4.1 — budget enforcement + auto-pause (spec §9).
 *
 * 1. Over-budget active operator → readiness blocks AND auto-pauses it
 *    (paused/pausedAt/pauseReason=budget_exceeded) with operator_paused
 *    task_event + activity_log notification.
 * 2. Second evaluation → idempotent (no duplicate pause events).
 * 3. Unmetered operator (budget=0) never pauses regardless of spend.
 * 4. Under-budget operator untouched.
 */
import { check, finish, TEST_PREFIX } from './_probe-env'

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, operators, taskEvents, activityLog } = await import('@/lib/db/schema')
  const { evaluateReadiness } = await import('@/lib/dispatch/readiness')
  const { eq, like, inArray } = await import('drizzle-orm')

  const opIds = ['probe-budget-over', 'probe-budget-unmetered', 'probe-budget-under']
  const taskIds: string[] = []

  try {
    await db.insert(operators).values([
      { id: opIds[0], name: `${TEST_PREFIX} over-budget op`, operatorType: 'agent', status: 'active', adapterType: 'hermes-oneshot', budgetMonthlyCents: 100, spentMonthlyCents: 150 },
      { id: opIds[1], name: `${TEST_PREFIX} unmetered op`, operatorType: 'agent', status: 'active', adapterType: 'hermes-oneshot', budgetMonthlyCents: 0, spentMonthlyCents: 99999 },
      { id: opIds[2], name: `${TEST_PREFIX} under-budget op`, operatorType: 'agent', status: 'active', adapterType: 'hermes-oneshot', budgetMonthlyCents: 1000, spentMonthlyCents: 10 },
    ])
    for (const opId of opIds) {
      const [t] = await db.insert(tasks).values({
        workspaceId: 'personal', title: `${TEST_PREFIX} budget task ${opId}`, status: 'To Do',
        assigneeType: 'agent', assigneeId: opId, sourceType: 'api',
      }).returning()
      taskIds.push(t.id)
    }

    // 1. Over-budget: blocked + auto-paused + notified.
    const over = await evaluateReadiness(taskIds[0])
    check('over-budget task blocked', !over.ready && over.blockers.some(b => b.includes('over budget')), JSON.stringify(over.blockers))
    const [pausedOp] = await db.select().from(operators).where(eq(operators.id, opIds[0]))
    check('operator auto-paused', pausedOp.status === 'paused' && pausedOp.pauseReason === 'budget_exceeded' && pausedOp.pausedAt !== null,
      JSON.stringify({ status: pausedOp.status, pauseReason: pausedOp.pauseReason }))
    const events1 = await db.select().from(taskEvents).where(eq(taskEvents.taskId, taskIds[0]))
    check('operator_paused task_event written', events1.filter(e => e.eventType === 'operator_paused').length === 1,
      events1.map(e => e.eventType).join(','))
    const activity = await db.select().from(activityLog).where(eq(activityLog.entityId, opIds[0]))
    check('operator_paused activity written', activity.some(a => a.action === 'operator_paused'), activity.map(a => a.action).join(','))

    // 2. Idempotent: re-evaluate; still blocked (now as paused), no dup events.
    const again = await evaluateReadiness(taskIds[0])
    check('second eval blocked as paused', !again.ready && again.blockers.some(b => b.includes('paused')), JSON.stringify(again.blockers))
    const events2 = await db.select().from(taskEvents).where(eq(taskEvents.taskId, taskIds[0]))
    check('no duplicate pause event', events2.filter(e => e.eventType === 'operator_paused').length === 1)

    // 3. Unmetered: spend never pauses.
    const unmetered = await evaluateReadiness(taskIds[1])
    check('unmetered op not budget-blocked', !unmetered.blockers.some(b => b.includes('budget')), JSON.stringify(unmetered.blockers))
    const [unmeteredOp] = await db.select().from(operators).where(eq(operators.id, opIds[1]))
    check('unmetered op still active', unmeteredOp.status === 'active', unmeteredOp.status)

    // 4. Under budget: untouched.
    await evaluateReadiness(taskIds[2])
    const [underOp] = await db.select().from(operators).where(eq(operators.id, opIds[2]))
    check('under-budget op still active', underOp.status === 'active', underOp.status)
  } finally {
    if (taskIds.length) {
      await db.delete(taskEvents).where(inArray(taskEvents.taskId, taskIds))
      await db.delete(activityLog).where(inArray(activityLog.entityId, [...taskIds, ...opIds]))
      await db.delete(tasks).where(inArray(tasks.id, taskIds))
    }
    await db.delete(operators).where(inArray(operators.id, opIds))
    const residueTasks = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    const residueOps = await db.select({ id: operators.id }).from(operators).where(like(operators.name, `${TEST_PREFIX}%`))
    check('residual test rows = 0', residueTasks.length === 0 && residueOps.length === 0,
      `tasks=${residueTasks.length} operators=${residueOps.length}`)
  }
  finish('probe P4.1')
}

main().catch((err) => { console.error(err); process.exit(1) })
