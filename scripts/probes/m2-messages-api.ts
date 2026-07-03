/**
 * Probe M2 — /api/messages POST/GET/PATCH (spec §4; acceptance §8.2 §8.5 §8.6
 * §8.7 at the API layer — the /messages UI halves are probed by m3).
 *
 * 1. Auth: bare POST 401; forged guest cookie POST 403.
 * 2. Bearer POST of 20 items (one runId) → 201; identical re-post → zero new
 *    rows AND no second digest_published event (one event per run, ever).
 * 3. Unknown workspaceId → 422 invalid_workspace.
 * 4. GET: draftStatus filter, keyset cursor pagination (each probe item seen
 *    exactly once, messageTs monotonically non-increasing).
 * 5. PATCH draftStatus → 'sent' leaves the awaiting-review set; bad id 404.
 * finally: delete msgtest-* comm_items + activity rows, residual 0.
 */
import { check, finish } from './_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const RUN_ID = 'msgtest-run-m2'
const HARNESS = 'msgtest-probe'

function makeItems(): Array<Record<string, unknown>> {
  const items = []
  for (let i = 0; i < 20; i++) {
    const daysAgo = i % 3 // spread across 3 days for the UI's grouped-by-day
    const ts = new Date(Date.now() - daysAgo * 24 * 3600 * 1000 - i * 60000)
    items.push({
      source: 'manual',
      workspaceId: 'personal',
      externalId: `msgtest-m2-${i}`,
      sender: `Probe Sender ${i} <probe${i}@example.test>`,
      subject: `[MSG-TEST] probe subject ${i}`,
      preview: `Probe preview line for item ${i}. Not a raw body.`,
      classification: i === 0 ? 'needs-reply' : i === 1 ? 'invoice' : 'fyi',
      actionTaken: i === 0 ? 'drafted' : 'none',
      draftId: i === 0 ? 'msgtest-draft-1' : null,
      draftStatus: i === 0 ? 'awaiting-review' : null,
      urgency: i === 0 ? 'interrupt' : 'digest',
      messageTs: ts.toISOString(),
      runId: RUN_ID,
    })
  }
  return items
}

async function main() {
  const { db } = await import('@/lib/db')
  const { commItems, activityLog } = await import('@/lib/db/schema')
  const { and, eq, like, sql } = await import('drizzle-orm')

  const bearer = {
    Authorization: `Bearer ${process.env.CRON_SECRET}`,
    'Content-Type': 'application/json',
    'x-harness-name': HARNESS,
    'x-harness-model': 'probe-model',
    'x-harness-session-id': 'msgtest-session-m2',
  }
  const items = makeItems()

  try {
    // 1 — auth
    const bare = await fetch(`${BASE}/api/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }),
    })
    check('bare POST → 401', bare.status === 401, String(bare.status))

    const guestCookie = `ops-session=${encodeURIComponent(JSON.stringify({ userId: 'guest-probe', email: 'guest@local', role: 'guest' }))}`
    const guest = await fetch(`${BASE}/api/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: guestCookie }, body: JSON.stringify({ items }),
    })
    check('guest POST → 403', guest.status === 403, String(guest.status))

    // 3 — invalid workspace (before the real post so nothing is half-written)
    const badWs = await fetch(`${BASE}/api/messages`, {
      method: 'POST', headers: bearer,
      body: JSON.stringify({ items: [{ ...items[0], workspaceId: 'not-a-workspace', externalId: 'msgtest-bad-ws' }] }),
    })
    const badWsBody = await badWs.json()
    check('unknown workspace → 422 invalid_workspace', badWs.status === 422 && badWsBody.code === 'invalid_workspace',
      `${badWs.status} ${badWsBody.code}`)

    // 2 — bulk upsert + idempotent re-post
    const post1 = await fetch(`${BASE}/api/messages`, { method: 'POST', headers: bearer, body: JSON.stringify({ items }) })
    const post1Body = await post1.json()
    check('bearer POST 20 items → 201, upserted=20', post1.status === 201 && post1Body.upserted === 20,
      `${post1.status} ${JSON.stringify(post1Body).slice(0, 120)}`)
    check('first post logged the run', Array.isArray(post1Body.loggedRuns) && post1Body.loggedRuns.includes(RUN_ID),
      JSON.stringify(post1Body.loggedRuns))

    const post2 = await fetch(`${BASE}/api/messages`, { method: 'POST', headers: bearer, body: JSON.stringify({ items }) })
    const post2Body = await post2.json()
    check('identical re-post → 201, no new activity run', post2.status === 201 && post2Body.loggedRuns.length === 0,
      JSON.stringify(post2Body.loggedRuns))

    const rows = await db.select().from(commItems).where(eq(commItems.runId, RUN_ID))
    check('zero duplicates after re-post (20 rows exactly)', rows.length === 20, String(rows.length))

    const events = await db.select().from(activityLog).where(and(
      eq(activityLog.eventType, 'digest_published'), eq(activityLog.workflowRunId, RUN_ID),
    ))
    check('exactly ONE digest_published event for the run', events.length === 1, String(events.length))
    check('event carries comms family + item count', events[0]?.eventFamily === 'comms'
      && (events[0]?.metadata as Record<string, unknown>)?.itemCount === 20,
      JSON.stringify({ fam: events[0]?.eventFamily, meta: events[0]?.metadata }))

    // 4 — GET filters + pagination
    const drafts = await (await fetch(`${BASE}/api/messages?draftStatus=awaiting-review&workspace=personal`, { headers: bearer })).json()
    const draftIds = drafts.items.filter((i: { externalId: string }) => i.externalId.startsWith('msgtest-')).map((i: { externalId: string }) => i.externalId)
    check('draftStatus filter returns the awaiting-review item', draftIds.length === 1 && draftIds[0] === 'msgtest-m2-0',
      JSON.stringify(draftIds))

    const seen: string[] = []
    let cursor: string | null = null
    let guard = 0
    let lastTs = Infinity
    let ordered = true
    do {
      const url: string = `${BASE}/api/messages?workspace=personal&source=manual&limit=7${cursor ? `&cursor=${cursor}` : ''}`
      const page = await (await fetch(url, { headers: bearer })).json()
      for (const it of page.items) {
        const ts = new Date(it.messageTs).getTime()
        if (ts > lastTs) ordered = false
        lastTs = ts
        if (it.externalId.startsWith('msgtest-m2-')) seen.push(it.externalId)
      }
      cursor = page.nextCursor
      guard++
    } while (cursor && guard < 20)
    check('cursor pagination: all 20 probe items seen exactly once', seen.length === 20 && new Set(seen).size === 20,
      `seen=${seen.length} unique=${new Set(seen).size}`)
    check('pagination ordering: messageTs non-increasing across pages', ordered)

    // 5 — PATCH
    const draftRow = rows.find((r) => r.externalId === 'msgtest-m2-0')!
    const patch = await fetch(`${BASE}/api/messages/${draftRow.id}`, {
      method: 'PATCH', headers: bearer, body: JSON.stringify({ draftStatus: 'sent' }),
    })
    const patched = await patch.json()
    check('PATCH draftStatus → sent', patch.status === 200 && patched.item?.draftStatus === 'sent',
      `${patch.status} ${patched.item?.draftStatus}`)

    const draftsAfter = await (await fetch(`${BASE}/api/messages?draftStatus=awaiting-review&workspace=personal`, { headers: bearer })).json()
    check('sent item left the awaiting-review set',
      !draftsAfter.items.some((i: { externalId: string }) => i.externalId === 'msgtest-m2-0'), '')

    const guestPatch = await fetch(`${BASE}/api/messages/${draftRow.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: guestCookie }, body: JSON.stringify({ draftStatus: 'sent' }),
    })
    check('guest PATCH → 403', guestPatch.status === 403, String(guestPatch.status))

    const missing = await fetch(`${BASE}/api/messages/00000000-0000-4000-8000-000000000000`, {
      method: 'PATCH', headers: bearer, body: JSON.stringify({ draftStatus: 'sent' }),
    })
    check('PATCH unknown id → 404', missing.status === 404, String(missing.status))
  } finally {
    await db.delete(commItems).where(like(commItems.externalId, 'msgtest-%'))
    await db.delete(activityLog).where(sql`${activityLog.workflowRunId} LIKE 'msgtest-%'`)
    await db.delete(activityLog).where(eq(activityLog.actorName, HARNESS))
    const residue = await db.select().from(commItems).where(like(commItems.externalId, 'msgtest-%'))
    const actResidue = await db.select().from(activityLog).where(sql`${activityLog.workflowRunId} LIKE 'msgtest-%'`)
    check('residual probe rows = 0', residue.length === 0 && actResidue.length === 0,
      `comm=${residue.length} act=${actResidue.length}`)
  }
  finish('probe M2 messages API')
}

main().catch((err) => { console.error(err); process.exit(1) })
