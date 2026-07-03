/**
 * Probe P4.2 + P4.3 — needs_artifact prompt injection & concurrency limits.
 *
 * P4.2: prereq Done with artifactUrl + needs_artifact edge → the dispatched
 * prompt (captured via a probe tmux session running cat) contains the
 * "Prerequisite artifacts:" block with title + URL; a blocks-only dependent
 * gets no artifact block.
 * P4.3: maxConcurrent=1 operator with two ready tasks → second dispatch is
 * refused at max concurrency; after the first task settles (Done), the slot
 * frees and the second dispatches.
 *
 * Uses dispatchTaskById directly (NOT runDispatchCycle — the full cycle would
 * sweep real ready tasks in the live DB).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { check, finish, TEST_PREFIX } from './_probe-env'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, operators, agentWakeupRequests, agentTaskSessions, taskEvents, taskDependencies, activityLog } = await import('@/lib/db/schema')
  const { dispatchTaskById, settleDispatchOnTerminal } = await import('@/lib/dispatch/engine')
  const { eq, like, inArray } = await import('drizzle-orm')

  const opId = 'probe-artifact-op'
  const session = `probe-p42-${process.pid}`
  const dir = mkdtempSync(join(tmpdir(), 'probe-p42-'))
  const sink = join(dir, 'sink.txt')
  const taskIds: string[] = []

  try {
    const created = spawnSync('tmux', ['new-session', '-d', '-s', session, `cat >> ${JSON.stringify(sink)}`])
    check('probe tmux session created', created.status === 0, String(created.stderr))

    await db.insert(operators).values({
      id: opId, name: `${TEST_PREFIX} artifact op`, operatorType: 'agent', status: 'active',
      adapterType: 'claude-tmux', dispatchConfig: { tmux_session: session }, maxConcurrent: 1, activeRunCount: 0,
    })

    const [prereq] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} artifact prereq`, status: 'Done',
      assigneeType: 'agent', assigneeId: opId, sourceType: 'api',
      artifactUrl: 'file:///tmp/artifact-A.txt', completedAt: new Date(),
    }).returning()
    const [dependent] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} artifact dependent`, status: 'To Do',
      assigneeType: 'agent', assigneeId: opId, sourceType: 'api',
    }).returning()
    const [plain] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} plain dependent`, status: 'To Do',
      assigneeType: 'agent', assigneeId: opId, sourceType: 'api',
    }).returning()
    taskIds.push(prereq.id, dependent.id, plain.id)
    await db.insert(taskDependencies).values([
      { prerequisiteTaskId: prereq.id, dependentTaskId: dependent.id, dependencyType: 'needs_artifact' },
      { prerequisiteTaskId: prereq.id, dependentTaskId: plain.id, dependencyType: 'blocks' },
    ])

    // ── P4.2: artifact-needing dependent ──
    // force:true makes the probe immune to the global ops pause AND to claim
    // races with the live launchd poller; every asserted behavior survives it:
    // artifact context is resolved regardless, and concurrency/live-session
    // are HARD guards that force never bypasses.
    const first = await dispatchTaskById(dependent.id, { force: true, actorName: 'probe' })
    check('artifact dependent dispatched', first.outcome === 'dispatched', JSON.stringify(first))
    await sleep(800)
    const prompt1 = existsSync(sink) ? readFileSync(sink, 'utf8') : ''
    check('prompt contains Prerequisite artifacts block', prompt1.includes('Prerequisite artifacts'), `${prompt1.length} bytes`)
    check('prompt contains artifact URL + prereq title',
      prompt1.includes('file:///tmp/artifact-A.txt') && prompt1.includes('artifact prereq'))

    // ── P4.3: operator at max concurrency refuses the second task ──
    const second = await dispatchTaskById(plain.id, { force: true, actorName: 'probe' })
    const refusedAtConcurrency = second.outcome === 'skipped'
      && (second.reason.includes('max concurrency') || (second.blockers ?? []).some(b => b.includes('max concurrency')))
    check('second dispatch refused at max concurrency (hard guard, force did not bypass)', refusedAtConcurrency, JSON.stringify(second))

    // Settle the first task (Done path frees the slot), then retry.
    await db.update(tasks).set({ status: 'Done', completedAt: new Date() }).where(eq(tasks.id, dependent.id))
    await settleDispatchOnTerminal(dependent.id)
    const [opAfterSettle] = await db.select().from(operators).where(eq(operators.id, opId))
    check('slot freed after settle (1→0)', opAfterSettle.activeRunCount === 0, String(opAfterSettle.activeRunCount))

    // Don't delete the sink — cat holds the fd; slice off the new bytes instead.
    const before = readFileSync(sink, 'utf8').length
    const third = await dispatchTaskById(plain.id, { force: true, actorName: 'probe' })
    check('second task dispatches after slot freed', third.outcome === 'dispatched', JSON.stringify(third))
    await sleep(800)
    const prompt2 = readFileSync(sink, 'utf8').slice(before)
    check('blocks-only dependent has NO artifact block', prompt2.length > 0 && !prompt2.includes('Prerequisite artifacts'), `${prompt2.length} new bytes`)
  } finally {
    spawnSync('tmux', ['kill-session', '-t', `=${session}`])
    if (taskIds.length) {
      await db.delete(taskDependencies).where(inArray(taskDependencies.prerequisiteTaskId, taskIds))
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
  finish('probe P4.2/P4.3')
}

main().catch((err) => { console.error(err); process.exit(1) })
