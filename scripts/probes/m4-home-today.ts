/**
 * Probe M4 — Home today-view + /brief provenance (acceptance §8.3 render half,
 * §8.4). Uses bearer-rendered HTML with probe hooks (data-home-brief,
 * data-brief-provenance, data-project-strip, data-resurfaced-item,
 * data-digest-counts).
 *
 * 1. Brief posted via bearer+harness headers renders on /brief AND Home with
 *    generated_by provenance.
 * 2. Home shows: project status strip; an artificially-aged urgent [MSG-TEST]
 *    task in the resurfaced list (absent at ?staleDays=30 — tunable); today's
 *    digest counts matching the DB.
 * finally: full msgtest cleanup, residual 0.
 */
import { neon } from '@neondatabase/serverless'
import { check, finish } from './_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const HARNESS = 'msgtest-probe'
const BRIEF_MARKER = 'MSGTEST-BRIEF-CONTENT-M4'
const TASK_TITLE = '[MSG-TEST] resurfaced probe task m4'

async function page(path: string, headers: Record<string, string>): Promise<string> {
  const res = await fetch(`${BASE}${path}`, { headers })
  if (res.status !== 200) throw new Error(`GET ${path} → ${res.status}`)
  return res.text()
}

async function main() {
  const { db } = await import('@/lib/db')
  const { commItems, activityLog, tasks, taskEvents } = await import('@/lib/db/schema')
  const { eq, like, sql: dsql, gte } = await import('drizzle-orm')
  const sql = neon(process.env.DATABASE_URL!)

  const bearer = {
    Authorization: `Bearer ${process.env.CRON_SECRET}`,
    'Content-Type': 'application/json',
    'x-harness-name': HARNESS,
    'x-harness-session-id': 'msgtest-session-m4',
  }
  let taskId: string | null = null

  try {
    // 1 — brief provenance on /brief and Home
    const briefPost = await fetch(`${BASE}/api/brief`, {
      method: 'POST', headers: bearer,
      body: JSON.stringify({ content: `Probe brief. ${BRIEF_MARKER} — morning summary.`, workspace_id: 'personal' }),
    })
    check('brief posted via bearer+harness headers → 201', briefPost.status === 201, String(briefPost.status))

    const briefHtml = await page('/brief', bearer)
    check('/brief renders the brief with provenance',
      briefHtml.includes(BRIEF_MARKER) && briefHtml.includes('data-brief-provenance') && briefHtml.includes(HARNESS), '')

    // 2 — resurfaced fixture: human-assigned [MSG-TEST] urgent task, aged 10d.
    // NEVER agent-assigned (standing hazard) — no assignee fields at all.
    const taskRes = await fetch(`${BASE}/api/tasks`, {
      method: 'POST', headers: bearer,
      body: JSON.stringify({ workspaceId: 'personal', title: TASK_TITLE, status: 'To Do', urgent: true }),
    })
    const task = await taskRes.json()
    taskId = task.id ?? null
    check('fixture task created (human-assigned)', taskRes.status === 201 && !!taskId && !task.assigneeType,
      `${taskRes.status} assigneeType=${task.assigneeType}`)
    if (!taskId) throw new Error('fixture task create failed')

    const aged = new Date(Date.now() - 10 * 24 * 3600 * 1000)
    await db.update(tasks).set({ lastActivityAt: aged, updatedAt: aged }).where(eq(tasks.id, taskId))

    // digest fixture: 2 items today, 1 interrupt, 1 awaiting-review draft
    const now = new Date()
    const msgPost = await fetch(`${BASE}/api/messages`, {
      method: 'POST', headers: bearer,
      body: JSON.stringify({
        items: [
          {
            source: 'manual', workspaceId: 'personal', externalId: 'msgtest-m4-0',
            sender: 'M4 Probe <m4@example.test>', subject: '[MSG-TEST] m4 interrupt', preview: 'Probe.',
            classification: 'needs-reply', actionTaken: 'drafted', draftId: 'msgtest-draft-m4',
            draftStatus: 'awaiting-review', urgency: 'interrupt', messageTs: now.toISOString(), runId: 'msgtest-run-m4',
          },
          {
            source: 'manual', workspaceId: 'personal', externalId: 'msgtest-m4-1',
            sender: 'M4 Probe <m4@example.test>', subject: '[MSG-TEST] m4 fyi', preview: 'Probe.',
            classification: 'fyi', actionTaken: 'none', urgency: 'digest',
            messageTs: now.toISOString(), runId: 'msgtest-run-m4',
          },
        ],
      }),
    })
    check('digest fixture posted', msgPost.status === 201, String(msgPost.status))

    // Expected counts from the DB (probe rows may coexist with real ones)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayRows = await db.select().from(commItems).where(gte(commItems.messageTs, todayStart))
    const expNew = todayRows.length
    const expInterrupts = todayRows.filter((r) => r.urgency === 'interrupt').length
    const expDrafts = (await db.select({ id: commItems.id }).from(commItems).where(eq(commItems.draftStatus, 'awaiting-review'))).length

    const home = await page('/', bearer)
    check('Home renders the brief with provenance', home.includes(BRIEF_MARKER) && home.includes('data-home-brief') && home.includes(HARNESS), '')
    check('Home has the project status strip', home.includes('data-project-strip'), '')
    check('aged urgent task resurfaces on Home', home.includes(`data-resurfaced-item="${taskId}"`), taskId)

    const counts = ['data-new', 'data-drafts', 'data-interrupts'].map((a) => {
      const m = home.match(new RegExp(`${a}="(\\d+)"`))
      return m ? Number(m[1]) : null
    })
    check('digest counts match the DB',
      home.includes('data-digest-counts') && counts[0] === expNew && counts[1] === expDrafts && counts[2] === expInterrupts,
      `page=${counts.join('/')} db=${expNew}/${expDrafts}/${expInterrupts}`)

    const home30 = await page('/?staleDays=30', bearer)
    check('staleDays tunable: 10d-idle task absent at ?staleDays=30', !home30.includes(`data-resurfaced-item="${taskId}"`), '')
  } finally {
    if (taskId) {
      await db.delete(taskEvents).where(eq(taskEvents.taskId, taskId))
      await db.delete(activityLog).where(eq(activityLog.entityId, taskId))
      await db.delete(tasks).where(eq(tasks.id, taskId))
    }
    await db.delete(commItems).where(like(commItems.externalId, 'msgtest-%'))
    await sql`DELETE FROM briefs WHERE generated_by = ${HARNESS}`
    await db.delete(activityLog).where(dsql`${activityLog.workflowRunId} LIKE 'msgtest-%'`)
    await db.delete(activityLog).where(eq(activityLog.actorName, HARNESS))
    const taskResidue = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, '[MSG-TEST]%'))
    const commResidue = await db.select({ id: commItems.id }).from(commItems).where(like(commItems.externalId, 'msgtest-%'))
    const briefResidue = await sql`SELECT count(*) AS n FROM briefs WHERE generated_by = ${HARNESS}`
    check('residual probe rows = 0',
      taskResidue.length === 0 && commResidue.length === 0 && Number(briefResidue[0].n) === 0,
      `tasks=${taskResidue.length} comm=${commResidue.length} briefs=${briefResidue[0].n}`)
  }
  finish('probe M4 home today-view')
}

main().catch((err) => { console.error(err); process.exit(1) })
