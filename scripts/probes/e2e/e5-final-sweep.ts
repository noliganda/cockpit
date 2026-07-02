/**
 * E2E proof E5 — final residual sweep. Read-only: asserts zero test residue
 * across tasks, operators, dependencies, wakeups, sessions, task_events,
 * activity_log, and tmux (no probe-* / dispatch-e2e-* sessions).
 */
import { spawnSync } from 'node:child_process'
import { check, finish, TEST_PREFIX } from '../_probe-env'

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, operators, agentWakeupRequests, agentTaskSessions, taskEvents, taskDependencies, activityLog } = await import('@/lib/db/schema')
  const { like, inArray, or, sql } = await import('drizzle-orm')

  const testTasks = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
  check('tasks residue = 0', testTasks.length === 0, String(testTasks.length))

  const testOps = await db.select({ id: operators.id }).from(operators)
    .where(or(like(operators.name, `${TEST_PREFIX}%`), like(operators.id, 'probe-%')))
  check('operators residue = 0', testOps.length === 0, testOps.map(o => o.id).join(','))

  const orphanChecks: [string, number][] = []
  if (testTasks.length > 0) {
    const ids = testTasks.map(t => t.id)
    orphanChecks.push(
      ['deps', (await db.select().from(taskDependencies).where(inArray(taskDependencies.dependentTaskId, ids))).length],
      ['wakeups', (await db.select().from(agentWakeupRequests).where(inArray(agentWakeupRequests.taskId, ids))).length],
      ['sessions', (await db.select().from(agentTaskSessions).where(inArray(agentTaskSessions.taskId, ids))).length],
      ['events', (await db.select().from(taskEvents).where(inArray(taskEvents.taskId, ids))).length],
    )
  }
  // Rows referencing probe operators (even with tasks gone).
  const probeWakeups = await db.select({ id: agentWakeupRequests.id }).from(agentWakeupRequests)
    .where(like(agentWakeupRequests.operatorId, 'probe-%'))
  check('probe-operator wakeups = 0', probeWakeups.length === 0, String(probeWakeups.length))
  const probeSessions = await db.select({ id: agentTaskSessions.id }).from(agentTaskSessions)
    .where(like(agentTaskSessions.operatorId, 'probe-%'))
  check('probe-operator sessions = 0', probeSessions.length === 0, String(probeSessions.length))
  const testActivity = await db.select({ id: activityLog.id }).from(activityLog)
    .where(sql`${activityLog.entityTitle} LIKE ${TEST_PREFIX + '%'}`)
  check('activity_log residue = 0', testActivity.length === 0, String(testActivity.length))
  check('no orphan rows', orphanChecks.every(([, n]) => n === 0), JSON.stringify(orphanChecks))

  const tmuxLs = spawnSync('tmux', ['ls'], { encoding: 'utf8' }).stdout ?? ''
  const strayTmux = tmuxLs.split('\n').filter(l => /^(probe-|dispatch-e2e-)/.test(l))
  check('no probe/e2e tmux sessions', strayTmux.length === 0, strayTmux.join(' | '))

  finish('E2E E5 final sweep')
}

main().catch((err) => { console.error(err); process.exit(1) })
