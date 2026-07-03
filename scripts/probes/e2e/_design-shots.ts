/**
 * Design-checker harness (not a gate probe): seeds representative msgtest-*
 * fixtures, screenshots /messages and / (desktop + mobile) to OUT_DIR, and
 * with CLEANUP=1 deletes every fixture (residual 0). Never touches real rows.
 * Run: BASE_URL=http://localhost:3100 OUT_DIR=/tmp/shots npx tsx scripts/probes/e2e/_design-shots.ts [seed|shoot|cleanup]
 */
import { existsSync, mkdirSync } from 'node:fs'
import { check, finish } from '../_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = process.env.OUT_DIR ?? '/tmp/msgs-design-shots'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const HARNESS = 'msgtest-design'
const RUN_A = 'msgtest-design-run-morning'
const RUN_B = 'msgtest-design-run-midday'

const bearer = {
  Authorization: `Bearer ${process.env.CRON_SECRET}`,
  'Content-Type': 'application/json',
  'x-harness-name': HARNESS,
}

function hoursAgo(h: number) { return new Date(Date.now() - h * 3600 * 1000).toISOString() }

async function seed() {
  const items = [
    { source: 'email', workspaceId: 'korus', externalId: 'msgtest-d-1', sender: 'Bruno Leal <bruno.lealdesousa@korusgroup.com>', subject: 'RE: Singapore fit-out — revised BOQ attached', preview: 'Bruno sent the revised bill of quantities; needs your sign-off before Friday. Draft reply prepared confirming the variation cap.', classification: 'needs-reply', actionTaken: 'drafted', draftId: 'd-101', draftStatus: 'awaiting-review', urgency: 'interrupt', messageTs: hoursAgo(2), runId: RUN_B },
    { source: 'email', workspaceId: 'byron-film', externalId: 'msgtest-d-2', sender: 'Sarah Chen <sarah@northernpictures.com.au>', subject: 'Grade review — episode 3 delivery window', preview: 'Post house can take the grade review Thursday 2pm; asked to confirm attendance.', classification: 'needs-reply', actionTaken: 'drafted', draftId: 'd-102', draftStatus: 'awaiting-review', urgency: 'digest', messageTs: hoursAgo(5), runId: RUN_B },
    { source: 'email', workspaceId: 'korus', externalId: 'msgtest-d-3', sender: 'Xero <notifications@xero.com>', subject: 'Invoice INV-2041 from Meridian Joinery', preview: 'Invoice for $18,400 (joinery package, stage 2). Filed to invoices; matches PO-118.', classification: 'invoice', actionTaken: 'archived', urgency: 'digest', messageTs: hoursAgo(6), runId: RUN_B },
    { source: 'email', workspaceId: 'personal', externalId: 'msgtest-d-4', sender: 'Qantas <noreply@qantas.com.au>', subject: 'Your flight QF544 is confirmed', preview: 'SYD → BNE Tuesday 07:15, seat 4C. Added to calendar.', classification: 'notification', actionTaken: 'archived', urgency: 'low', messageTs: hoursAgo(8), runId: RUN_B },
    { source: 'email', workspaceId: 'byron-film', externalId: 'msgtest-d-5', sender: 'Screen Australia <enews@screenaustralia.gov.au>', subject: 'Industry update — July funding rounds', preview: 'Monthly newsletter; documentary fund opens 14 July.', classification: 'newsletter', actionTaken: 'archived', urgency: 'low', messageTs: hoursAgo(9), runId: RUN_B },
    { source: 'email', workspaceId: 'korus', externalId: 'msgtest-d-6', sender: 'Marc Dubois <marc.dubois@korusgroup.com>', subject: 'Paris showroom — lighting spec approved', preview: 'Client approved the lighting spec; procurement can proceed. FYI only.', classification: 'fyi', actionTaken: 'left', urgency: 'digest', messageTs: hoursAgo(26), runId: RUN_A },
    { source: 'email', workspaceId: 'personal', externalId: 'msgtest-d-7', sender: 'Byron Bay Council <rates@byron.nsw.gov.au>', subject: 'Rates notice Q1 — due 21 July', preview: 'Quarterly rates $1,240 due 21 July. Task queued to pay before due date.', classification: 'needs-reply', actionTaken: 'queued-task', urgency: 'digest', messageTs: hoursAgo(28), runId: RUN_A },
    { source: 'email', workspaceId: 'byron-film', externalId: 'msgtest-d-8', sender: 'Tom Riley <tom@gaffercrew.com.au>', subject: 'Avail update for the August shoot block', preview: 'Tom confirmed avail 4–15 August; holding the dates until Friday.', classification: 'fyi', actionTaken: 'surfaced', urgency: 'digest', messageTs: hoursAgo(30), runId: RUN_A },
    { source: 'email', workspaceId: 'korus', externalId: 'msgtest-d-9', sender: 'LinkedIn <messages-noreply@linkedin.com>', subject: 'You have 4 new notifications', preview: 'Social noise.', classification: 'spam', actionTaken: 'archived', urgency: 'low', messageTs: hoursAgo(31), runId: RUN_A },
    { source: 'email', workspaceId: 'personal', externalId: 'msgtest-d-10', sender: 'Nadia Marcolin <nadia@familymail.com>', subject: 'Weekend plans + school pickup Thursday', preview: 'Asks about Thursday pickup and the weekend market. Draft reply prepared.', classification: 'needs-reply', actionTaken: 'drafted', draftId: 'd-103', draftStatus: 'awaiting-review', urgency: 'digest', messageTs: hoursAgo(50), runId: 'msgtest-design-run-old' },
  ]
  const res = await fetch(`${BASE}/api/messages`, { method: 'POST', headers: bearer, body: JSON.stringify({ items }) })
  if (res.status !== 201) throw new Error(`seed items → ${res.status}: ${await res.text()}`)

  const brief = await fetch(`${BASE}/api/brief`, {
    method: 'POST', headers: bearer,
    body: JSON.stringify({
      content: '**Quiet morning across the three inboxes.** KORUS is the busy one: Bruno needs a sign-off on the revised Singapore BOQ *(draft ready)* and the Meridian joinery invoice matched PO-118.\n\n- Byron Film: grade review slot offered Thursday 2pm — draft confirmation waiting.\n- Personal: council rates due 21 July, task queued.\n- 3 drafts are awaiting your review; nothing is on fire.',
      workspace_id: 'personal',
    }),
  })
  if (brief.status !== 201) throw new Error(`seed brief → ${brief.status}`)
  console.log('seeded 10 comm items + 1 brief')
}

async function shoot() {
  if (!existsSync(CHROME)) { console.log('SKIP no system Chrome'); process.exit(2) }
  mkdirSync(OUT, { recursive: true })
  const { chromium } = await import('playwright-core')
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  try {
    for (const [name, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]] as const) {
      const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 })
      await context.addCookies([{
        name: 'ops-session',
        value: encodeURIComponent(JSON.stringify({ userId: 'probe', email: 'probe@local', role: 'admin' })),
        domain: 'localhost', path: '/',
      }])
      const page = await context.newPage()
      for (const [route, label] of [['/messages', 'messages'], ['/', 'home']] as const) {
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(800)
        await page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true })
      }
      await context.close()
    }
    console.log(`shots written to ${OUT}`)
  } finally {
    await browser.close()
  }
}

async function cleanup() {
  const { neon } = await import('@neondatabase/serverless')
  const { db } = await import('@/lib/db')
  const { commItems, activityLog } = await import('@/lib/db/schema')
  const { like, sql: dsql, eq } = await import('drizzle-orm')
  const sql = neon(process.env.DATABASE_URL!)
  await db.delete(commItems).where(like(commItems.externalId, 'msgtest-%'))
  await sql`DELETE FROM briefs WHERE generated_by = ${HARNESS}`
  await db.delete(activityLog).where(dsql`${activityLog.workflowRunId} LIKE 'msgtest-%'`)
  await db.delete(activityLog).where(eq(activityLog.actorName, HARNESS))
  const commResidue = await db.select({ id: commItems.id }).from(commItems).where(like(commItems.externalId, 'msgtest-%'))
  const briefResidue = await sql`SELECT count(*) AS n FROM briefs WHERE generated_by = ${HARNESS}`
  check('design-fixture residual = 0', commResidue.length === 0 && Number(briefResidue[0].n) === 0,
    `comm=${commResidue.length} briefs=${briefResidue[0].n}`)
  finish('design-shots cleanup')
}

const mode = process.argv[2] ?? 'shoot'
const run = mode === 'seed' ? seed : mode === 'cleanup' ? cleanup : shoot
run().catch((err) => { console.error(err); process.exit(1) })
