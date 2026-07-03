/**
 * Probe P4.5 — dispatch soft-pause toggle.
 *
 * 1. POST /api/dispatch/pause {paused:true} → status route reflects it.
 * 2. runDispatchCycle() while paused → returns {paused:true}, dispatches
 *    nothing (this is also what makes calling the real cycle safe here).
 * 3. Unforced dispatchTaskById → skipped with a pause reason; force=true
 *    overrides and dispatches.
 * 4. Resume via API → cleared. finally() always resumes + cleans rows.
 */
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { check, finish, TEST_PREFIX } from './_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, operators, agentWakeupRequests, agentTaskSessions, taskEvents, activityLog, dispatchState } = await import('@/lib/db/schema')
  const { runDispatchCycle, dispatchTaskById, isDispatchPaused } = await import('@/lib/dispatch/engine')
  const { eq, inArray, like, sql } = await import('drizzle-orm')

  const bearer = { Authorization: `Bearer ${process.env.CRON_SECRET}`, 'Content-Type': 'application/json' }
  const opId = 'probe-pause-op'
  const dir = mkdtempSync(join(tmpdir(), 'probe-pause-'))
  const taskIds: string[] = []

  try {
    const noAuth = await fetch(`${BASE}/api/dispatch/pause`, { method: 'POST', body: JSON.stringify({ paused: true }), headers: { 'Content-Type': 'application/json' } })
    check('pause: 401 without bearer', noAuth.status === 401, String(noAuth.status))

    const pauseRes = await (await fetch(`${BASE}/api/dispatch/pause`, { method: 'POST', headers: bearer, body: JSON.stringify({ paused: true }) })).json()
    check('paused via API', pauseRes.success === true && pauseRes.paused === true, JSON.stringify(pauseRes))
    check('engine sees pause', await isDispatchPaused())

    const status = await (await fetch(`${BASE}/api/dispatch/status`, { headers: bearer })).json()
    check('status route reflects pause', status.state.paused === true && !!status.state.pausedBy, JSON.stringify(status.state))

    const cycle = await runDispatchCycle()
    check('paused cycle dispatches nothing', cycle.paused === true && cycle.dispatched === 0 && cycle.candidates === 0, JSON.stringify(cycle))

    // Fixture for the manual-path checks.
    const fake = join(dir, 'fake-hermes')
    writeFileSync(fake, '#!/bin/sh\necho "session_id: pause-probe-1"\n')
    chmodSync(fake, 0o755)
    await db.insert(operators).values({
      id: opId, name: `${TEST_PREFIX} pause op`, operatorType: 'agent', status: 'active',
      adapterType: 'hermes-oneshot', dispatchConfig: { command: fake, sessionIdWaitMs: 2000 }, maxConcurrent: 1, activeRunCount: 0,
    })
    const [task] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} pause task`, status: 'To Do',
      assigneeType: 'agent', assigneeId: opId, sourceType: 'api',
    }).returning()
    taskIds.push(task.id)

    const blocked = await dispatchTaskById(task.id)
    check('unforced dispatch skipped while paused', blocked.outcome === 'skipped' && blocked.reason.includes('paused'), JSON.stringify(blocked))
    const forced = await dispatchTaskById(task.id, { force: true, actorName: 'probe' })
    check('force overrides pause', forced.outcome === 'dispatched', JSON.stringify(forced))

    const resume = await (await fetch(`${BASE}/api/dispatch/pause`, { method: 'POST', headers: bearer, body: JSON.stringify({ paused: false }) })).json()
    check('resumed via API', resume.success === true && resume.paused === false, JSON.stringify(resume))
    check('engine sees resume', !(await isDispatchPaused()))

    const pauseActivity = await db.select().from(activityLog).where(inArray(activityLog.action, ['dispatch_paused', 'dispatch_resumed']))
    check('pause/resume logged to activity spine', pauseActivity.length >= 2, String(pauseActivity.length))
  } finally {
    await db.update(dispatchState).set({ paused: false, pausedAt: null, pausedBy: null }).where(eq(dispatchState.id, 'singleton'))
    if (taskIds.length) {
      await db.delete(agentWakeupRequests).where(inArray(agentWakeupRequests.taskId, taskIds))
      await db.delete(agentTaskSessions).where(inArray(agentTaskSessions.taskId, taskIds))
      await db.delete(taskEvents).where(inArray(taskEvents.taskId, taskIds))
      await db.delete(tasks).where(inArray(tasks.id, taskIds))
    }
    await db.delete(operators).where(eq(operators.id, opId))
    await db.delete(activityLog).where(sql`${activityLog.entityTitle} LIKE ${TEST_PREFIX + '%'}`)
    // Only THIS probe's pause events (bearer-without-harness identity is
    // 'api@local') — never real pause/resume audit rows from the dashboard.
    await db.delete(activityLog).where(
      sql`${activityLog.action} IN ('dispatch_paused','dispatch_resumed') AND ${activityLog.actor} = 'api@local'`,
    )
    rmSync(dir, { recursive: true, force: true })
    const residue = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    check('residual test rows = 0', residue.length === 0, String(residue.length))
    check('pause left OFF', !(await isDispatchPaused()))
  }
  finish('probe P4.5 pause toggle')
}

main().catch((err) => { console.error(err); process.exit(1) })
