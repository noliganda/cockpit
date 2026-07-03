/**
 * Probe P4.6 — a task created the way the dashboard dialog creates it
 * (POST /api/tasks with assigneeId from the operator registry and
 * assigneeType 'agent') is a genuine dispatch candidate: readiness passes and
 * the engine's candidate filter matches it. Proves the "create it by hand in
 * the UI and it will start" path at the API layer.
 */
import { check, finish, TEST_PREFIX } from './_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, taskEvents, activityLog } = await import('@/lib/db/schema')
  const { evaluateReadiness } = await import('@/lib/dispatch/readiness')
  const { eq, like, sql, and, inArray } = await import('drizzle-orm')

  const bearer = { Authorization: `Bearer ${process.env.CRON_SECRET}`, 'Content-Type': 'application/json' }
  let taskId: string | null = null

  // Snapshot ops pause state — restore it in finally rather than forcing it
  // off (an operator-held pause, e.g. during a maintenance run, must survive
  // the gate). Same discipline as p45.
  const { dispatchState } = await import('@/lib/db/schema')
  const { eq: eqInit } = await import('drizzle-orm')
  const { db: dbInit } = await import('@/lib/db')
  const [initial] = await dbInit.select().from(dispatchState).where(eqInit(dispatchState.id, 'singleton')).limit(1)
  const initialPause = { paused: initial?.paused ?? false, pausedAt: initial?.pausedAt ?? null, pausedBy: initial?.pausedBy ?? null }

  try {
    // Pause dispatching first: this probe briefly parks a REAL ready task
    // assigned to hermes, and the Mini's live poller must not race us to it.
    await fetch(`${BASE}/api/dispatch/pause`, { method: 'POST', headers: bearer, body: JSON.stringify({ paused: true }) })
    // Exact shape the task dialog submits for "🤖 Hermes" + status To Do.
    const created = await (await fetch(`${BASE}/api/tasks`, {
      method: 'POST',
      headers: bearer,
      body: JSON.stringify({
        workspaceId: 'personal',
        title: `${TEST_PREFIX} dialog-shaped task`,
        description: 'Probe: dialog-created tasks must be dispatchable.',
        status: 'To Do',
        // the dialog omits sourceType — server default applies
        assignee: 'Hermes',
        assigneeId: 'hermes',
        assigneeName: 'Hermes',
        assigneeType: 'agent',
      }),
    })).json()
    taskId = created.id ?? created.task?.id ?? null
    check('task created via API', !!taskId, JSON.stringify(created).slice(0, 200))
    // NEVER finish() (process.exit) inside try — it would skip finally and
    // leave the pause ON for every later probe. Throw so cleanup runs.
    if (!taskId) throw new Error('create failed — see check above')

    const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId!))
    check('assignee fields persisted', row.assigneeId === 'hermes' && row.assigneeType === 'agent', JSON.stringify({ id: row.assigneeId, type: row.assigneeType }))

    const candidates = await db.select({ id: tasks.id }).from(tasks).where(and(
      inArray(tasks.status, ['Backlog', 'To Do']),
      inArray(tasks.assigneeType, ['agent', 'function']),
      eq(tasks.id, taskId!),
    ))
    check('matches engine candidate filter', candidates.length === 1)

    const readiness = await evaluateReadiness(taskId!)
    check('readiness: fully ready to dispatch', readiness.ready === true, JSON.stringify(readiness.blockers))
  } finally {
    if (taskId) {
      await db.delete(taskEvents).where(eq(taskEvents.taskId, taskId))
      await db.delete(activityLog).where(eq(activityLog.entityId, taskId))
      await db.delete(tasks).where(eq(tasks.id, taskId))
    }
    await db.update(dispatchState).set(initialPause).where(eqInit(dispatchState.id, 'singleton'))
    await db.delete(activityLog).where(sql`${activityLog.entityTitle} LIKE ${TEST_PREFIX + '%'}`)
    await db.delete(activityLog).where(
      sql`${activityLog.action} IN ('dispatch_paused','dispatch_resumed') AND ${activityLog.actor} = 'api@local'`,
    )
    const residue = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    check('residual test rows = 0', residue.length === 0, String(residue.length))
    const { isDispatchPaused } = await import('@/lib/dispatch/engine')
    check('ops pause state restored to entry value', (await isDispatchPaused()) === initialPause.paused, `expected ${initialPause.paused}`)
  }
  finish('probe P4.6 dialog-task dispatchable')
}

main().catch((err) => { console.error(err); process.exit(1) })
