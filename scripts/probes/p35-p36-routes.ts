/**
 * Probe P3.5 + P3.6 — GET /api/dispatch/status and POST /api/tasks/[id]/dispatch.
 *
 * Requires a local server (default http://localhost:3000, override BASE_URL)
 * with the same .env.local. Exercises: auth (401), status shape, not-ready 409
 * with blockers, force=true happy path through a fake-hermes temp operator,
 * double-dispatch 409, terminal-status 409 under force, 404, and the running
 * claim showing up in the status queue. All rows namespaced + deleted.
 */
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { check, finish, TEST_PREFIX } from './_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, operators, agentWakeupRequests, agentTaskSessions, taskEvents, taskDependencies, activityLog } = await import('@/lib/db/schema')
  const { like, inArray, eq } = await import('drizzle-orm')

  const bearer = { Authorization: `Bearer ${process.env.CRON_SECRET}` }
  const opId = 'probe-routes-op'
  const taskIds: string[] = []
  const dir = mkdtempSync(join(tmpdir(), 'probe-routes-'))

  try {
    // ── auth ──
    const noAuthStatus = await fetch(`${BASE}/api/dispatch/status`)
    check('status: 401 without bearer', noAuthStatus.status === 401, String(noAuthStatus.status))

    const withAuth = await fetch(`${BASE}/api/dispatch/status`, { headers: bearer })
    check('status: 200 with bearer', withAuth.status === 200, String(withAuth.status))
    const status = await withAuth.json()
    check('status: shape (operators, queue, staleClaims, state)',
      Array.isArray(status.operators) && status.queue?.counts && Array.isArray(status.staleClaims) && 'dispatchEnabled' in status,
      Object.keys(status).join(','))
    check('status: hermes operator listed', status.operators.some((o: { id: string }) => o.id === 'hermes'))

    // ── fixtures ──
    const fake = join(dir, 'fake-hermes')
    writeFileSync(fake, '#!/bin/sh\necho "session_id: probe-routes-99"\n')
    chmodSync(fake, 0o755)
    await db.insert(operators).values({
      id: opId, name: `${TEST_PREFIX} routes op`, operatorType: 'agent', status: 'active',
      adapterType: 'hermes-oneshot', dispatchConfig: { command: fake, sessionIdWaitMs: 3000 }, maxConcurrent: 1, activeRunCount: 0,
    })
    const [prereq] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} routes prereq`, status: 'To Do',
      assigneeType: 'agent', assigneeId: opId, sourceType: 'api',
    }).returning()
    const [dependent] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} routes dependent`, status: 'To Do',
      assigneeType: 'agent', assigneeId: opId, sourceType: 'api',
    }).returning()
    const [doneTask] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} routes done-task`, status: 'Done',
      assigneeType: 'agent', assigneeId: opId, sourceType: 'api',
    }).returning()
    taskIds.push(prereq.id, dependent.id, doneTask.id)
    await db.insert(taskDependencies).values({ prerequisiteTaskId: prereq.id, dependentTaskId: dependent.id, dependencyType: 'blocks' })

    // ── manual dispatch: guards ──
    const noAuthDispatch = await fetch(`${BASE}/api/tasks/${dependent.id}/dispatch`, { method: 'POST' })
    check('dispatch: 401 without bearer', noAuthDispatch.status === 401, String(noAuthDispatch.status))

    const notReady = await fetch(`${BASE}/api/tasks/${dependent.id}/dispatch`, { method: 'POST', headers: bearer })
    const notReadyBody = await notReady.json()
    check('dispatch: 409 not_ready with blockers', notReady.status === 409 && notReadyBody.code === 'not_ready'
      && notReadyBody.blockers?.some((b: string) => b.includes('prerequisite')), JSON.stringify(notReadyBody))

    const missing = await fetch(`${BASE}/api/tasks/00000000-0000-4000-8000-000000000000/dispatch`, { method: 'POST', headers: bearer })
    check('dispatch: 404 unknown task', missing.status === 404, String(missing.status))

    const forcedDone = await fetch(`${BASE}/api/tasks/${doneTask.id}/dispatch?force=true`, { method: 'POST', headers: bearer })
    const forcedDoneBody = await forcedDone.json()
    check('dispatch: force on Done task still 409', forcedDone.status === 409, `${forcedDone.status} ${JSON.stringify(forcedDoneBody)}`)

    // ── manual dispatch: forced happy path ──
    const forced = await fetch(`${BASE}/api/tasks/${dependent.id}/dispatch?force=true`, { method: 'POST', headers: bearer })
    const forcedBody = await forced.json()
    check('dispatch: force=true dispatches past unmet dep', forced.status === 200 && forcedBody.outcome === 'dispatched', JSON.stringify(forcedBody))
    check('dispatch: harness session id captured', forcedBody.harnessSessionId === 'probe-routes-99', forcedBody.harnessSessionId)

    const [wakeup] = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.taskId, dependent.id))
    check('dispatch: wakeup running', wakeup?.status === 'running', wakeup?.status)
    const events = await db.select().from(taskEvents).where(eq(taskEvents.taskId, dependent.id))
    const dispatchEvent = events.find(e => e.eventType === 'task_dispatched')
    check('dispatch: task_dispatched event with forced flag',
      (dispatchEvent?.metadata as { forced?: boolean } | null)?.forced === true, JSON.stringify(dispatchEvent?.metadata))

    const double = await fetch(`${BASE}/api/tasks/${dependent.id}/dispatch?force=true`, { method: 'POST', headers: bearer })
    const doubleBody = await double.json()
    check('dispatch: double-force 409 (live session)', double.status === 409 && String(doubleBody.error).includes('active session'), JSON.stringify(doubleBody))

    // ── status reflects the in-flight claim ──
    const after = await (await fetch(`${BASE}/api/dispatch/status`, { headers: bearer })).json()
    const inQueue = after.queue.items.find((q: { taskId: string }) => q.taskId === dependent.id)
    check('status: running claim visible in queue', inQueue?.status === 'running', JSON.stringify(inQueue ?? null))
    check('status: fresh claim not stale', inQueue?.isStale === false)

    // ── dependencies GET (harness surface used by E2E) ──
    const deps = await fetch(`${BASE}/api/tasks/${dependent.id}/dependencies`, { headers: bearer })
    check('dependencies GET 200', deps.status === 200, String(deps.status))
  } finally {
    if (taskIds.length) {
      await db.delete(taskDependencies).where(inArray(taskDependencies.dependentTaskId, taskIds))
      await db.delete(agentWakeupRequests).where(inArray(agentWakeupRequests.taskId, taskIds))
      await db.delete(agentTaskSessions).where(inArray(agentTaskSessions.taskId, taskIds))
      await db.delete(taskEvents).where(inArray(taskEvents.taskId, taskIds))
      await db.delete(activityLog).where(inArray(activityLog.entityId, taskIds))
      await db.delete(tasks).where(inArray(tasks.id, taskIds))
    }
    await db.delete(operators).where(eq(operators.id, opId))
    rmSync(dir, { recursive: true, force: true })
    const residueTasks = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    const residueOps = await db.select({ id: operators.id }).from(operators).where(like(operators.name, `${TEST_PREFIX}%`))
    check('residual test rows = 0', residueTasks.length === 0 && residueOps.length === 0,
      `tasks=${residueTasks.length} operators=${residueOps.length}`)
  }
  finish('probe P3.5/P3.6')
}

main().catch((err) => { console.error(err); process.exit(1) })
