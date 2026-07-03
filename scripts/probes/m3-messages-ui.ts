/**
 * Probe M3 — /messages rendered UI (spec §5; acceptance §8.2 render half,
 * §8.5 drafts-rail half). Server-renders the page with the bearer header and
 * asserts against the HTML's probe hooks (data-day-group / data-run-group /
 * data-msg-item / data-draft-item).
 *
 * 1. POST 20 items across 3 days (one awaiting-review draft) → page shows
 *    every item exactly once, under the correct day group, rail shows draft.
 * 2. Identical re-post → still exactly once each (no duplicate rendering).
 * 3. PATCH draft → 'sent' → rail no longer lists it.
 * finally: delete msgtest rows, residual 0.
 */
import { check, finish } from './_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const RUN_ID = 'msgtest-run-m3'
const HARNESS = 'msgtest-probe'

function makeItems() {
  const items = []
  for (let i = 0; i < 20; i++) {
    const daysAgo = i % 3
    const ts = new Date(Date.now() - daysAgo * 24 * 3600 * 1000 - i * 60000)
    items.push({
      source: 'manual',
      workspaceId: 'personal',
      externalId: `msgtest-m3-${i}`,
      sender: `Probe Sender ${i} <probe${i}@example.test>`,
      subject: `[MSG-TEST] m3 subject ${i}`,
      preview: `Probe preview ${i}.`,
      classification: i === 0 ? 'needs-reply' : 'fyi',
      actionTaken: i === 0 ? 'drafted' : 'none',
      draftId: i === 0 ? 'msgtest-draft-m3' : null,
      draftStatus: i === 0 ? ('awaiting-review' as const) : null,
      urgency: 'digest',
      messageTs: ts.toISOString(),
      runId: RUN_ID,
    })
  }
  return items
}

async function fetchPage(headers: Record<string, string>): Promise<string> {
  const res = await fetch(`${BASE}/messages`, { headers })
  if (res.status !== 200) throw new Error(`GET /messages → ${res.status}`)
  return res.text()
}

function occurrences(html: string, needle: string): number {
  return html.split(needle).length - 1
}

async function main() {
  const { db } = await import('@/lib/db')
  const { commItems, activityLog } = await import('@/lib/db/schema')
  const { eq, like, sql } = await import('drizzle-orm')

  const bearer = {
    Authorization: `Bearer ${process.env.CRON_SECRET}`,
    'Content-Type': 'application/json',
    'x-harness-name': HARNESS,
    'x-harness-session-id': 'msgtest-session-m3',
  }
  const items = makeItems()

  try {
    const post = await fetch(`${BASE}/api/messages`, { method: 'POST', headers: bearer, body: JSON.stringify({ items }) })
    check('items posted', post.status === 201, String(post.status))

    let html = await fetchPage(bearer)

    const allOnce = items.every((i) => occurrences(html, `data-msg-item="${i.externalId}"`) === 1)
    check('all 20 items rendered exactly once', allOnce,
      items.map((i) => `${i.externalId}:${occurrences(html, `data-msg-item="${i.externalId}"`)}`).filter((s) => !s.endsWith(':1')).join(','))

    // Day grouping: each item must sit inside the section whose
    // data-day-group matches its local day (same tz as the server).
    const sections = html.split('data-day-group="').slice(1)
    const itemToDay = new Map<string, string>()
    for (const sec of sections) {
      const day = sec.slice(0, sec.indexOf('"'))
      for (const i of items) {
        if (sec.includes(`data-msg-item="${i.externalId}"`)) itemToDay.set(i.externalId, day)
      }
    }
    const expectedDays = new Set(items.map((i) => new Date(i.messageTs).toLocaleDateString('en-CA')))
    check('grouped across 3 day sections', new Set(itemToDay.values()).size === 3 && expectedDays.size === 3,
      `sections=${new Set(itemToDay.values()).size} expected=${expectedDays.size}`)
    const misgrouped = items.filter((i) => itemToDay.get(i.externalId) !== new Date(i.messageTs).toLocaleDateString('en-CA'))
    check('every item under its correct day group', misgrouped.length === 0,
      misgrouped.map((i) => i.externalId).join(','))

    const railHtml = html.split('data-drafts-rail')[1]?.split('data-day-group')[0] ?? ''
    check('drafts rail shows the awaiting-review item', railHtml.includes('data-draft-item="msgtest-m3-0"'), '')

    // 2 — idempotent re-post renders no duplicates
    const repost = await fetch(`${BASE}/api/messages`, { method: 'POST', headers: bearer, body: JSON.stringify({ items }) })
    check('re-post accepted', repost.status === 201, String(repost.status))
    html = await fetchPage(bearer)
    const stillOnce = items.every((i) => occurrences(html, `data-msg-item="${i.externalId}"`) === 1)
    check('after re-post: still exactly once each (zero duplicates)', stillOnce, '')

    // 3 — PATCH the draft to sent → leaves the rail
    const [draftRow] = await db.select().from(commItems).where(eq(commItems.externalId, 'msgtest-m3-0'))
    const patch = await fetch(`${BASE}/api/messages/${draftRow.id}`, {
      method: 'PATCH', headers: bearer, body: JSON.stringify({ draftStatus: 'sent' }),
    })
    check('PATCH → sent', patch.status === 200, String(patch.status))
    html = await fetchPage(bearer)
    const railAfter = html.split('data-drafts-rail')[1]?.split('data-day-group')[0] ?? ''
    check('rail empties after PATCH to sent', !railAfter.includes('data-draft-item="msgtest-m3-0"'), '')
    check('item itself still in the feed', occurrences(html, 'data-msg-item="msgtest-m3-0"') === 1, '')
  } finally {
    await db.delete(commItems).where(like(commItems.externalId, 'msgtest-%'))
    await db.delete(activityLog).where(sql`${activityLog.workflowRunId} LIKE 'msgtest-%'`)
    await db.delete(activityLog).where(eq(activityLog.actorName, HARNESS))
    const residue = await db.select().from(commItems).where(like(commItems.externalId, 'msgtest-%'))
    check('residual probe rows = 0', residue.length === 0, String(residue.length))
  }
  finish('probe M3 messages UI')
}

main().catch((err) => { console.error(err); process.exit(1) })
