/**
 * E2E proof E2 — real claude-tmux dispatch into a fresh tmux session.
 *
 * Requires the :3100 server with DISPATCH_ENABLED=true and the claude CLI.
 * NOT part of run-all.sh — spawns a real Claude Code run.
 *
 * The driver creates tmux session `dispatch-e2e-claude` (NEVER an existing
 * session), starts interactive Claude Code in it (bypass-permissions so the
 * dispatched task's file write + curl don't block on dialogs), temporarily
 * points the real claude-code operator at it (restored in finally), then
 * dispatches a real task via the manual route. Claude Code must self-register
 * per cockpit-wiring, pass through In Progress, and complete Done with an
 * artifact. Session killed + rows cleaned afterward.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { check, finish, TEST_PREFIX } from '../_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const SESSION = 'dispatch-e2e-claude'
const WORKDIR = '/Users/agentsmyth/workspaces/dev/cockpit'
const PROOF = '/tmp/e2e-claude-proof.txt'
const TASK_TIMEOUT_MS = 10 * 60_000

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const tmux = (...args: string[]) => spawnSync('tmux', args, { encoding: 'utf8' })
const pane = () => tmux('capture-pane', '-p', '-t', `=${SESSION}:`).stdout ?? ''

/** Boot interactive Claude Code in the fresh session, past any dialogs. */
async function bootClaude(): Promise<boolean> {
  tmux('new-session', '-d', '-s', SESSION, '-c', WORKDIR)
  await sleep(1500)
  // Type the launch command as keystrokes so the login shell's env (incl. the
  // SOPS-loaded COCKPIT_API_TOKEN) is inherited without putting secrets in argv.
  tmux('send-keys', '-t', `=${SESSION}:`, '-l', 'claude --dangerously-skip-permissions')
  tmux('send-keys', '-t', `=${SESSION}:`, 'Enter')

  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    await sleep(3000)
    const text = pane()
    if (/bypass permissions/i.test(text) && /accept/i.test(text)) {
      tmux('send-keys', '-t', `=${SESSION}:`, '2')
      tmux('send-keys', '-t', `=${SESSION}:`, 'Enter')
      continue
    }
    if (/do you trust the files/i.test(text)) {
      tmux('send-keys', '-t', `=${SESSION}:`, 'Enter')
      continue
    }
    // Ready when the input box / shortcut hints are visible.
    if (/\? for shortcuts|bypass permissions on|❯|>\s*$/m.test(text)) return true
  }
  console.error('claude TUI never became ready; last pane:\n' + pane())
  return false
}

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, operators, agentWakeupRequests, agentTaskSessions, taskEvents, activityLog } = await import('@/lib/db/schema')
  const { eq, and, inArray, like } = await import('drizzle-orm')

  const bearer = { Authorization: `Bearer ${process.env.CRON_SECRET}` }
  const taskIds: string[] = []
  let originalConfig: unknown = null

  try {
    // ── preflight ──
    const pre = await db.select({ id: tasks.id }).from(tasks)
      .where(and(inArray(tasks.status, ['Backlog', 'To Do']), inArray(tasks.assigneeType, ['agent', 'function'])))
    check('no pre-existing dispatch candidates', pre.length === 0, String(pre.length))
    if (pre.length > 0) finish('E2 (aborted preflight)')
    check('fresh session name unused', tmux('has-session', '-t', `=${SESSION}`).status !== 0)
    rmSync(PROOF, { force: true })

    // ── boot Claude Code in the fresh session ──
    const ready = await bootClaude()
    check('claude TUI ready in fresh session', ready)
    if (!ready) finish('E2 (claude boot failed)')

    // ── point the real claude-code operator at the test session ──
    const [op] = await db.select().from(operators).where(eq(operators.id, 'claude-code'))
    originalConfig = op.dispatchConfig
    await db.update(operators)
      .set({ dispatchConfig: { workdir: WORKDIR, tmux_session: SESSION } })
      .where(eq(operators.id, 'claude-code'))

    // ── the task ──
    const [task] = await db.insert(tasks).values({
      workspaceId: 'personal',
      title: `${TEST_PREFIX} E2 claude-tmux proof`,
      description: [
        'E2E dispatch verification task. Do EXACTLY this and nothing else:',
        `1. Write the file ${PROOF} containing the single line: PROOF-CLAUDE`,
        '2. Per the cockpit-wiring protocol referenced above: PATCH this task to',
        '   status "In Progress" with x-harness-name/x-harness-model/x-harness-session-id',
        `   headers, then PATCH it to "Done" with completionSummary and artifactUrl file://${PROOF}`,
        'Use COCKPIT_API_TOKEN from your environment. Do not create any other Cockpit',
        'tasks, do not run cockpit-task start, do not touch anything else. Prefer',
        `${BASE} as the API base URL (fall back to the production URL if unreachable).`,
      ].join('\n'),
      status: 'To Do', assigneeType: 'agent', assigneeId: 'claude-code', assigneeName: 'Claude Code',
      sourceType: 'api', priority: 'high',
    }).returning()
    taskIds.push(task.id)

    // ── dispatch via the manual route (unforced — task must be genuinely ready) ──
    const dispatched = await (await fetch(`${BASE}/api/tasks/${task.id}/dispatch`, { method: 'POST', headers: bearer })).json()
    check('manual dispatch steered the session', dispatched.outcome === 'dispatched' && dispatched.harnessSessionId === `tmux:${SESSION}`,
      JSON.stringify(dispatched))

    // ── wait for Claude Code to run it to Done ──
    let t = task
    const deadline = Date.now() + TASK_TIMEOUT_MS
    while (Date.now() < deadline) {
      ;[t] = await db.select().from(tasks).where(eq(tasks.id, task.id))
      if (t.status === 'Done') break
      await sleep(10_000)
    }
    check('task completed Done by Claude Code', t.status === 'Done', `${t.status} — pane tail: ${pane().split('\n').slice(-6).join(' | ')}`)
    check('passed through In Progress (startedAt+completedAt)', !!t.startedAt && !!t.completedAt,
      JSON.stringify({ startedAt: t.startedAt, completedAt: t.completedAt }))
    check('self-registered execution footprint', !!t.executingSessionId || !!t.executingModel,
      JSON.stringify({ model: t.executingModel, session: t.executingSessionId }))
    check('artifact linked', !!t.artifactUrl, String(t.artifactUrl))
    check('proof file written', existsSync(PROOF) && readFileSync(PROOF, 'utf8').includes('PROOF-CLAUDE'))
    const events = await db.select().from(taskEvents).where(eq(taskEvents.taskId, task.id))
    check('dispatch + start + complete events', ['task_dispatched', 'task_started', 'task_completed'].every(k => events.some(e => e.eventType === k)),
      events.map(e => e.eventType).join(','))
  } finally {
    tmux('kill-session', '-t', `=${SESSION}`)
    if (originalConfig) {
      await db.update(operators).set({ dispatchConfig: originalConfig }).where(eq(operators.id, 'claude-code'))
    }
    if (taskIds.length) {
      await db.delete(agentWakeupRequests).where(inArray(agentWakeupRequests.taskId, taskIds))
      await db.delete(agentTaskSessions).where(inArray(agentTaskSessions.taskId, taskIds))
      await db.delete(taskEvents).where(inArray(taskEvents.taskId, taskIds))
      await db.delete(activityLog).where(inArray(activityLog.entityId, taskIds))
      await db.delete(tasks).where(inArray(tasks.id, taskIds))
    }
    rmSync(PROOF, { force: true })
    const [restored] = await db.select().from(operators).where(eq(operators.id, 'claude-code'))
    check('claude-code operator config restored', (restored.dispatchConfig as { tmux_session?: string }).tmux_session === 'dispatch-claude',
      JSON.stringify(restored.dispatchConfig))
    check('e2e session killed', tmux('has-session', '-t', `=${SESSION}`).status !== 0)
    const residueTasks = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    check('residual test rows = 0', residueTasks.length === 0, `${residueTasks.length} left`)
  }
  finish('E2E E2 claude-tmux')
}

main().catch((err) => { console.error(err); process.exit(1) })
