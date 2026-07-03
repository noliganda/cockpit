/**
 * E2E E6 — mobile-flow rehearsal (the point of the ops-live run).
 *
 * With the launchd poller + live engine on this Mac:
 *  (a) create a task through the REAL dashboard dialog (playwright, system
 *      Chrome) picking the Hermes agent operator — the next poll cycle must
 *      dispatch it with NO manual dispatch call;
 *  (b) enqueue a second task via `cockpit-task queue` — same expectation.
 * Both run to Done by real hermes (bounded briefs, proof files).
 *
 * The dialog's description editor is BlockNote (not driveable cheaply), so the
 * brief is PATCHed via API right after creation — dispatch QUALIFICATION
 * (status/assignee typing) still comes 100% from the dialog-created row.
 *
 * Safety: requires paused=true on entry (the ops-run safety state), sweeps
 * real candidates (aborts if any), unpauses only for the rehearsal window,
 * re-pauses in finally. Requires the :3200 launchd server.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { check, finish, TEST_PREFIX } from '../_probe-env'

const LOCAL = 'http://localhost:3200'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const POLL_LOG = `${process.env.HOME}/Library/Logs/cockpit-dispatch/poll.log`
const PROOF_A = '/tmp/e2e-mobile-A.txt'
const PROOF_B = '/tmp/e2e-mobile-B.txt'
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function brief(letter: string, proof: string) {
  return [
    'E2E dispatch verification task. Do EXACTLY this and nothing else:',
    `1. Write the file ${proof} containing the single line: PROOF-${letter}`,
    '2. Per cockpit-wiring: PATCH this task to "In Progress" (x-harness-* headers),',
    `   then to "Done" with completionSummary and artifactUrl file://${proof}`,
    'Do not create other Cockpit tasks. Do not touch anything else.',
  ].join('\n')
}

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, dispatchState, agentWakeupRequests, agentTaskSessions, taskEvents, activityLog } = await import('@/lib/db/schema')
  const { eq, and, inArray, like, sql } = await import('drizzle-orm')

  const bearer = { Authorization: `Bearer ${process.env.CRON_SECRET}`, 'Content-Type': 'application/json' }
  const taskIds: string[] = []
  const setPause = async (on: boolean) => {
    await db.update(dispatchState)
      .set({ paused: on, pausedAt: on ? new Date() : null, pausedBy: on ? 'ops-run-safety' : null })
      .where(eq(dispatchState.id, 'singleton'))
  }

  try {
    // ── preflight ──
    check('system Chrome present', existsSync(CHROME))
    const statusRes = await (await fetch(`${LOCAL}/api/dispatch/status`, { headers: bearer })).json()
    check('launchd server live w/ engine capability', statusRes.dispatchEnabled === true, JSON.stringify(statusRes.dispatchEnabled))
    check('entered paused (safety state)', statusRes.state.paused === true, JSON.stringify(statusRes.state))
    const lastPoll = existsSync(POLL_LOG) ? readFileSync(POLL_LOG, 'utf8').trim().split('\n').at(-1)! : ''
    check('poller has run recently', lastPoll.includes('success'), lastPoll.slice(0, 80))
    const pre = await db.select({ id: tasks.id, title: tasks.title }).from(tasks)
      .where(and(inArray(tasks.status, ['Backlog', 'To Do']), inArray(tasks.assigneeType, ['agent', 'function'])))
    check('no real dispatch candidates (sweep)', pre.length === 0, JSON.stringify(pre))
    if (pre.length > 0) throw new Error('real candidates present — aborting rehearsal')
    rmSync(PROOF_A, { force: true }); rmSync(PROOF_B, { force: true })

    // ── (a) dashboard-dialog path ──
    const { chromium } = await import('playwright-core')
    const browser = await chromium.launch({ executablePath: CHROME, headless: true })
    let taskAId: string | null = null
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
      await context.addCookies([{
        name: 'ops-session',
        value: encodeURIComponent(JSON.stringify({ userId: 'probe', email: 'probe@local', role: 'admin' })),
        domain: 'localhost', path: '/',
      }])
      const page = await context.newPage()
      await page.goto(`${LOCAL}/tasks?workspace=personal`, { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /new task/i }).first().click({ timeout: 20_000 })
      await page.getByPlaceholder('Task title *').fill(`${TEST_PREFIX} mobile-flow A (dialog)`)
      const assigneeSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Unassigned' }) }).first()
      // The hermes option appears only once the operator registry has loaded
      // (the dialog gates virtual entries on it) — wait for it like a fast
      // human would see the list populate.
      await assigneeSelect.locator('option[value="hermes"]').waitFor({ state: 'attached', timeout: 15_000 })
      await assigneeSelect.selectOption('hermes')
      await page.getByRole('button', { name: 'Create task' }).click()
      // Row must exist with the dialog's own typing.
      for (let i = 0; i < 20 && !taskAId; i++) {
        await sleep(500)
        const [row] = await db.select().from(tasks).where(eq(tasks.title, `${TEST_PREFIX} mobile-flow A (dialog)`))
        if (row) taskAId = row.id
      }
    } finally {
      await browser.close()
    }
    check('dialog created the task', !!taskAId)
    if (!taskAId) throw new Error('dialog create failed')
    taskIds.push(taskAId)
    const [rowA] = await db.select().from(tasks).where(eq(tasks.id, taskAId))
    check('dialog row: agent-typed hermes assignee, dispatchable status',
      rowA.assigneeType === 'agent' && rowA.assigneeId === 'hermes' && ['Backlog', 'To Do'].includes(rowA.status),
      JSON.stringify({ type: rowA.assigneeType, id: rowA.assigneeId, status: rowA.status }))
    // Brief via API (BlockNote not driveable) — qualification already proven above.
    await fetch(`${LOCAL}/api/tasks/${taskAId}`, { method: 'PATCH', headers: bearer, body: JSON.stringify({ description: brief('A', PROOF_A) }) })

    // ── (b) queue-command path ──
    const queueOut = execFileSync(`${process.env.HOME}/workspaces/_shared/tools/cockpit-task`,
      ['queue', `${TEST_PREFIX} mobile-flow B (queue)`, '-w', 'personal', '-d', brief('B', PROOF_B), '-p', 'high'],
      { encoding: 'utf8' })
    const taskBId = /QUEUED (\S+)/.exec(queueOut)?.[1]
    check('queue command created the task', !!taskBId, queueOut.trim().slice(0, 100))
    if (!taskBId) throw new Error('queue create failed')
    taskIds.push(taskBId)

    // ── unpause and let the POLLER do everything ──
    await setPause(false)
    const dispatchDeadline = Date.now() + 5 * 60_000 // poller fires every 3 min
    const dispatched = new Set<string>()
    while (Date.now() < dispatchDeadline && dispatched.size < 2) {
      await sleep(10_000)
      for (const id of taskIds) {
        if (dispatched.has(id)) continue
        const events = await db.select().from(taskEvents).where(and(eq(taskEvents.taskId, id), eq(taskEvents.eventType, 'task_dispatched')))
        if (events.length > 0) dispatched.add(id)
      }
    }
    check('poller dispatched the dialog task (no manual call)', dispatched.has(taskAId))
    check('poller dispatched the queued task (no manual call)', dispatched.has(taskBId!))

    // ── both run to Done by real hermes ──
    const doneDeadline = Date.now() + 8 * 60_000
    let a = rowA, b = (await db.select().from(tasks).where(eq(tasks.id, taskBId!)))[0]
    while (Date.now() < doneDeadline && !(a.status === 'Done' && b.status === 'Done')) {
      await sleep(15_000)
      ;[a] = await db.select().from(tasks).where(eq(tasks.id, taskAId))
      ;[b] = await db.select().from(tasks).where(eq(tasks.id, taskBId!))
    }
    check('dialog task Done by harness', a.status === 'Done', a.status)
    check('queued task Done by harness', b.status === 'Done', b.status)
    check('proof files written', existsSync(PROOF_A) && existsSync(PROOF_B),
      `A=${existsSync(PROOF_A)} B=${existsSync(PROOF_B)}`)
    check('both self-registered', (!!a.executingSessionId || !!a.executingModel) && (!!b.executingSessionId || !!b.executingModel),
      JSON.stringify({ a: a.executingModel, b: b.executingModel }))
  } finally {
    await setPause(true) // safety state until the final sweep decides otherwise
    if (taskIds.length) {
      await db.delete(agentWakeupRequests).where(inArray(agentWakeupRequests.taskId, taskIds))
      await db.delete(agentTaskSessions).where(inArray(agentTaskSessions.taskId, taskIds))
      await db.delete(taskEvents).where(inArray(taskEvents.taskId, taskIds))
      await db.delete(activityLog).where(inArray(activityLog.entityId, taskIds))
      await db.delete(tasks).where(inArray(tasks.id, taskIds))
    }
    await db.delete(activityLog).where(sql`${activityLog.entityTitle} LIKE ${TEST_PREFIX + '%'}`)
    rmSync(PROOF_A, { force: true }); rmSync(PROOF_B, { force: true })
    const residue = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    check('residual test rows = 0', residue.length === 0, String(residue.length))
  }
  finish('E2E E6 mobile-flow rehearsal')
}

main().catch((err) => { console.error(err); process.exit(1) })
