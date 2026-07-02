/**
 * Probe D1 — stray legacy statuses must never be dispatchable.
 *
 * toNormalized() maps unknown status strings (e.g. 'Completed', which exists
 * in prod data) to 'queued' as a lenient fallback. Readiness must reject the
 * task anyway: unknown status → blocker, never ready.
 */
import { check, finish, TEST_PREFIX } from './_probe-env'

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, activityLog } = await import('@/lib/db/schema')
  const { evaluateReadiness } = await import('@/lib/dispatch/readiness')
  const { eq, like, sql } = await import('drizzle-orm')

  const title = `${TEST_PREFIX} D1 stray-status probe`
  let taskId: string | null = null
  try {
    // A task that would be fully ready if its status were trusted: real active
    // operator (hermes), agent assignee — but a status outside the known set.
    const [row] = await db.insert(tasks).values({
      workspaceId: 'personal',
      title,
      status: 'Completed', // stray legacy value, NOT in LEGACY_STATUSES
      assigneeType: 'agent',
      assigneeId: 'hermes',
      assigneeName: 'Hermes',
      sourceType: 'api',
    }).returning({ id: tasks.id })
    taskId = row.id

    const stray = await evaluateReadiness(taskId)
    check('stray status is not ready', stray.ready === false, JSON.stringify(stray.blockers))
    check(
      'stray status names the status blocker',
      stray.blockers.some(b => b.includes('"Completed"')),
      JSON.stringify(stray.blockers),
    )

    // Control: same task with a known dispatchable status must NOT trip the
    // status blocker (other blockers, e.g. concurrency, are irrelevant here).
    await db.update(tasks).set({ status: 'To Do' }).where(eq(tasks.id, taskId))
    const known = await evaluateReadiness(taskId)
    check(
      'known dispatchable status has no status blocker',
      !known.blockers.some(b => b.toLowerCase().includes('status')),
      JSON.stringify(known.blockers),
    )
  } finally {
    if (taskId) await db.delete(tasks).where(eq(tasks.id, taskId))
    // A DB-side hook logs task creation to activity_log — sweep that too.
    await db.delete(activityLog).where(sql`${activityLog.entityTitle} LIKE ${TEST_PREFIX + '%'}`)
    const residue = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    check('residual test tasks = 0', residue.length === 0, `${residue.length} left`)
  }
  finish('probe D1')
}

main().catch((err) => { console.error(err); process.exit(1) })
