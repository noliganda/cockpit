/**
 * E2E proof E3 — stale-claim reclamation on a deliberately killed harness.
 *
 * Requires the :3100 server with DISPATCH_ENABLED=true (same as E1).
 *
 * A temp operator's command override spawns a long-sleeping child through the
 * REAL oneshot spawn path. We dispatch via the manual trigger route (E4),
 * kill the child (simulated harness crash), age the claim past the 5-min
 * oneshot threshold, verify the status route flags it stale (E4), then run
 * the real cron cycle and watch it reclaim AND re-dispatch in one pass.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { check, finish, TEST_PREFIX } from '../_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, operators, agentWakeupRequests, agentTaskSessions, taskEvents, activityLog } = await import('@/lib/db/schema')
  const { eq, and, inArray, like } = await import('drizzle-orm')

  const bearer = { Authorization: `Bearer ${process.env.CRON_SECRET}` }
  const opId = 'probe-e3-op'
  const dir = mkdtempSync(join(tmpdir(), 'probe-e3-'))
  const sleeper = join(dir, 'sleeper.sh')
  writeFileSync(sleeper, '#!/bin/sh\nsleep 600\n')
  chmodSync(sleeper, 0o755)
  const taskIds: string[] = []

  try {
    const pre = await db.select({ id: tasks.id }).from(tasks)
      .where(and(inArray(tasks.status, ['Backlog', 'To Do']), inArray(tasks.assigneeType, ['agent', 'function'])))
    check('no pre-existing dispatch candidates', pre.length === 0, String(pre.length))
    if (pre.length > 0) finish('E3 (aborted preflight)')

    await db.insert(operators).values({
      id: opId, name: `${TEST_PREFIX} E3 op`, operatorType: 'agent', status: 'active',
      adapterType: 'hermes-oneshot', dispatchConfig: { command: sleeper, sessionIdWaitMs: 500 }, maxConcurrent: 1, activeRunCount: 0,
    })
    const [task] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} E3 crash-reclaim task`, status: 'To Do',
      assigneeType: 'agent', assigneeId: opId, sourceType: 'api',
    }).returning()
    taskIds.push(task.id)

    // ── dispatch via the manual trigger (E4) ──
    const dispatched = await (await fetch(`${BASE}/api/tasks/${task.id}/dispatch`, { method: 'POST', headers: bearer })).json()
    check('manual dispatch spawned the child', dispatched.outcome === 'dispatched', JSON.stringify(dispatched))
    const pid = Number(/^oneshot-pid-(\d+)$/.exec(dispatched.harnessSessionId ?? '')?.[1])
    check('pid captured from session id', Number.isFinite(pid) && pid > 0, dispatched.harnessSessionId)

    // ── kill the harness (simulated crash) ──
    process.kill(pid, 'SIGKILL')
    await new Promise(r => setTimeout(r, 300))
    let alive = true
    try { process.kill(pid, 0) } catch { alive = false }
    check('child process killed', !alive)

    // ── age the claim past the 5-min oneshot threshold ──
    const sixMinAgo = new Date(Date.now() - 6 * 60_000)
    await db.update(agentWakeupRequests).set({ claimedAt: sixMinAgo })
      .where(and(eq(agentWakeupRequests.taskId, task.id), inArray(agentWakeupRequests.status, ['claimed', 'running'])))
    await db.update(agentTaskSessions).set({ lastCheckpointAt: sixMinAgo })
      .where(eq(agentTaskSessions.taskId, task.id))

    // ── status route flags it stale (E4) ──
    const status = await (await fetch(`${BASE}/api/dispatch/status`, { headers: bearer })).json()
    const staleEntry = status.staleClaims.find((q: { taskId: string }) => q.taskId === task.id)
    check('status route flags the dead claim stale', !!staleEntry && staleEntry.isStale === true, JSON.stringify(staleEntry ?? null))

    // ── real cron cycle: reclaim + re-dispatch in one pass ──
    const cycle = await (await fetch(`${BASE}/api/cron/dispatch`, { headers: bearer })).json()
    check('cycle reclaimed the stale claim', cycle.reclaimed === 1, JSON.stringify(cycle))
    check('cycle re-dispatched the task', cycle.dispatched === 1, JSON.stringify(cycle))

    const events = await db.select().from(taskEvents).where(eq(taskEvents.taskId, task.id))
    check('task_claim_stale_reclaimed event written', events.some(e => e.eventType === 'task_claim_stale_reclaimed'),
      events.map(e => e.eventType).join(','))
    check('two dispatch events (original + re-dispatch)', events.filter(e => e.eventType === 'task_dispatched').length === 2)

    const [wakeup] = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.taskId, task.id))
    check('wakeup running again after re-dispatch', wakeup.status === 'running', wakeup.status)
    const [session] = await db.select().from(agentTaskSessions).where(eq(agentTaskSessions.taskId, task.id))
    const newPid = Number(/^oneshot-pid-(\d+)$/.exec(session.sessionDisplayId ?? '')?.[1])
    check('session reactivated with a NEW child pid', session.status === 'active' && Number.isFinite(newPid) && newPid !== pid,
      `status=${session.status} old=${pid} new=${newPid}`)
    if (Number.isFinite(newPid)) { try { process.kill(newPid, 'SIGKILL') } catch { /* already gone */ } }
  } finally {
    spawnSync('pkill', ['-f', sleeper])
    if (taskIds.length) {
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
  finish('E2E E3 stale reclamation')
}

main().catch((err) => { console.error(err); process.exit(1) })
