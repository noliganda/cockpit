/**
 * E2E proof E1 — real hermes-oneshot dispatch, end to end (spec §8 Phase 2/3
 * verification, run as part of the Phase 3+4 completion loop).
 *
 * Requires: a local server with DISPATCH_ENABLED=true (default
 * http://localhost:3100, override BASE_URL) and the real `hermes` CLI.
 * NOT part of run-all.sh — this spawns real paid harness runs.
 *
 * Proves: cron cycle dispatches task A via real `hermes chat -Q`; the spawned
 * harness self-registers (executing session on the task), passes through
 * In Progress, completes Done with an artifact; the cascade promotes dependent
 * B (task_unblocked + dependency_cascade wakeup); cycle 2 dispatches B.
 * All rows cleaned; residual 0.
 */
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { check, finish, TEST_PREFIX } from '../_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const POLL_MS = 10_000
const TASK_TIMEOUT_MS = 6 * 60_000

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function taskDescription(letter: string, proofPath: string) {
  return [
    'E2E dispatch verification task. Do EXACTLY this and nothing else:',
    `1. Write the file ${proofPath} containing the single line: PROOF-${letter}`,
    '2. Per the cockpit-wiring protocol: PATCH this task to status "In Progress"',
    '   (registering harness/model/session via the x-harness-* headers), then',
    `   PATCH it to "Done" with a completionSummary and artifactUrl file://${proofPath}`,
    'Do not create any other Cockpit tasks. Do not touch anything else.',
  ].join('\n')
}

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, operators, agentWakeupRequests, agentTaskSessions, taskEvents, taskDependencies, activityLog, dispatchState } = await import('@/lib/db/schema')
  const { eq, and, inArray, like } = await import('drizzle-orm')

  const bearer = { Authorization: `Bearer ${process.env.CRON_SECRET}` }
  const proofA = '/tmp/e2e-hermes-proof-A.txt'
  const proofB = '/tmp/e2e-hermes-proof-B.txt'
  const taskIds: string[] = []

  try {
    // ── preflight ──
    const status = await (await fetch(`${BASE}/api/dispatch/status`, { headers: bearer })).json()
    check('server has DISPATCH_ENABLED=true', status.dispatchEnabled === true, JSON.stringify(status.dispatchEnabled))
    const [hermesOp] = await db.select().from(operators).where(eq(operators.id, 'hermes'))
    check('hermes operator active w/ oneshot adapter', hermesOp?.status === 'active' && hermesOp.adapterType === 'hermes-oneshot',
      JSON.stringify({ status: hermesOp?.status, adapter: hermesOp?.adapterType }))
    const preCandidates = await db.select({ id: tasks.id }).from(tasks)
      .where(and(inArray(tasks.status, ['Backlog', 'To Do']), inArray(tasks.assigneeType, ['agent', 'function'])))
    check('no pre-existing dispatch candidates', preCandidates.length === 0, `${preCandidates.length} found — ABORT if not test rows`)
    if (preCandidates.length > 0) { finish('E1 (aborted preflight)') }
    // Watermark row must exist for cycle bookkeeping (additive, idempotent).
    await db.insert(dispatchState).values({ id: 'singleton' }).onConflictDoNothing()
    rmSync(proofA, { force: true }); rmSync(proofB, { force: true })

    // ── fixtures: A, and B blocked on A ──
    const [taskA] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} E1-A hermes oneshot proof`, status: 'To Do',
      description: taskDescription('A', proofA),
      assigneeType: 'agent', assigneeId: 'hermes', assigneeName: 'Hermes', sourceType: 'api', priority: 'high',
    }).returning()
    const [taskB] = await db.insert(tasks).values({
      workspaceId: 'personal', title: `${TEST_PREFIX} E1-B cascade dependent`, status: 'To Do',
      description: taskDescription('B', proofB),
      assigneeType: 'agent', assigneeId: 'hermes', assigneeName: 'Hermes', sourceType: 'api', priority: 'high',
    }).returning()
    taskIds.push(taskA.id, taskB.id)
    await db.insert(taskDependencies).values({ prerequisiteTaskId: taskA.id, dependentTaskId: taskB.id, dependencyType: 'blocks' })

    // ── cycle 1: A dispatched, B blocked ──
    const cycle1 = await (await fetch(`${BASE}/api/cron/dispatch`, { headers: bearer })).json()
    check('cycle 1 dispatched exactly A', cycle1.dispatched === 1 && cycle1.candidates === 2, JSON.stringify(cycle1))
    check('cycle 1 skipped B on prerequisite', cycle1.skipped?.some((s: { taskId: string; reason: string }) => s.taskId === taskB.id && s.reason.includes('prerequisite')), JSON.stringify(cycle1.skipped))

    // ── wait for the real harness to run A to Done ──
    let a = taskA
    const deadlineA = Date.now() + TASK_TIMEOUT_MS
    while (Date.now() < deadlineA) {
      ;[a] = await db.select().from(tasks).where(eq(tasks.id, taskA.id))
      if (a.status === 'Done') break
      await sleep(POLL_MS)
    }
    check('A completed Done by the harness', a.status === 'Done', a.status)
    check('A passed through In Progress (startedAt+completedAt set)', !!a.startedAt && !!a.completedAt,
      JSON.stringify({ startedAt: a.startedAt, completedAt: a.completedAt }))
    check('A self-registered execution footprint', !!a.executingSessionId || !!a.executingModel,
      JSON.stringify({ model: a.executingModel, session: a.executingSessionId }))
    check('A carries artifactUrl', !!a.artifactUrl, String(a.artifactUrl))
    check('proof file A written by harness', existsSync(proofA) && readFileSync(proofA, 'utf8').includes('PROOF-A'))
    const eventsA = await db.select().from(taskEvents).where(eq(taskEvents.taskId, taskA.id))
    check('A has dispatch + start + complete events',
      eventsA.some(e => e.eventType === 'task_dispatched') && eventsA.some(e => e.eventType === 'task_started') && eventsA.some(e => e.eventType === 'task_completed'),
      eventsA.map(e => e.eventType).join(','))

    // ── cascade promoted B ──
    const eventsB = await db.select().from(taskEvents).where(eq(taskEvents.taskId, taskB.id))
    check('B has task_unblocked cascade event', eventsB.some(e => e.eventType === 'task_unblocked'), eventsB.map(e => e.eventType).join(','))
    const wakeupsB = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.taskId, taskB.id))
    check('B has dependency_cascade wakeup', wakeupsB.some(w => w.source === 'dependency_cascade'), wakeupsB.map(w => `${w.source}:${w.status}`).join(','))

    // ── cycle 2: B dispatched ──
    const cycle2 = await (await fetch(`${BASE}/api/cron/dispatch`, { headers: bearer })).json()
    check('cycle 2 dispatched B', cycle2.dispatched === 1, JSON.stringify(cycle2))

    let b = taskB
    const deadlineB = Date.now() + TASK_TIMEOUT_MS
    while (Date.now() < deadlineB) {
      ;[b] = await db.select().from(tasks).where(eq(tasks.id, taskB.id))
      if (b.status === 'Done') break
      await sleep(POLL_MS)
    }
    check('B completed Done by the harness', b.status === 'Done', b.status)
    check('proof file B written by harness', existsSync(proofB) && readFileSync(proofB, 'utf8').includes('PROOF-B'))

    // Settle check: hermes slots back to zero for these runs.
    const [hermesAfter] = await db.select().from(operators).where(eq(operators.id, 'hermes'))
    check('hermes run slots settled', hermesAfter.activeRunCount === 0, String(hermesAfter.activeRunCount))
  } finally {
    if (taskIds.length) {
      await db.delete(taskDependencies).where(inArray(taskDependencies.prerequisiteTaskId, taskIds))
      await db.delete(agentWakeupRequests).where(inArray(agentWakeupRequests.taskId, taskIds))
      await db.delete(agentTaskSessions).where(inArray(agentTaskSessions.taskId, taskIds))
      await db.delete(taskEvents).where(inArray(taskEvents.taskId, taskIds))
      await db.delete(activityLog).where(inArray(activityLog.entityId, taskIds))
      await db.delete(tasks).where(inArray(tasks.id, taskIds))
    }
    rmSync(proofA, { force: true }); rmSync(proofB, { force: true })
    const residueTasks = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    check('residual test rows = 0', residueTasks.length === 0, `${residueTasks.length} left`)
  }
  finish('E2E E1 hermes-oneshot')
}

main().catch((err) => { console.error(err); process.exit(1) })
