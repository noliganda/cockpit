/**
 * Probe M1 — /api/brief bearer + provenance fix (spec §4, acceptance §8.3 API half, §8.6 for briefs).
 *
 * 1. Bare POST → 401; forged guest ops-session cookie POST → 403.
 * 2. Bearer POST with x-harness-name and NO generated_by in body → 201 with
 *    generated_by taken from the harness header (provenance).
 * 3. GET (bearer) returns that brief as the latest, provenance intact.
 * 4. Exactly one brief_published activity_log event for the run.
 * finally: delete probe briefs + activity rows, residual 0.
 */
import { neon } from '@neondatabase/serverless'
import { check, finish } from './_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const PROBE_HARNESS = 'msgtest-probe'

async function main() {
  const { db } = await import('@/lib/db')
  const { activityLog } = await import('@/lib/db/schema')
  const { and, eq, sql: dsql } = await import('drizzle-orm')
  const sql = neon(process.env.DATABASE_URL!)

  const bearer = {
    Authorization: `Bearer ${process.env.CRON_SECRET}`,
    'Content-Type': 'application/json',
    'x-harness-name': PROBE_HARNESS,
    'x-harness-model': 'probe-model',
    'x-harness-session-id': 'msgtest-session-1',
  }
  const content = `[MSG-TEST] probe brief ${new Date().toISOString()}`

  try {
    const bare = await fetch(`${BASE}/api/brief`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
    })
    check('bare POST → 401', bare.status === 401, String(bare.status))

    const guestCookie = `ops-session=${encodeURIComponent(JSON.stringify({ userId: 'guest-probe', email: 'guest@local', role: 'guest' }))}`
    const guest = await fetch(`${BASE}/api/brief`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: guestCookie }, body: JSON.stringify({ content }),
    })
    check('guest-session POST → 403', guest.status === 403, String(guest.status))

    const post = await fetch(`${BASE}/api/brief`, {
      method: 'POST', headers: bearer, body: JSON.stringify({ content, workspace_id: 'personal' }),
    })
    const posted = await post.json()
    check('bearer POST → 201', post.status === 201, String(post.status))
    check('generated_by from x-harness-name', posted.brief?.generated_by === PROBE_HARNESS, JSON.stringify(posted.brief?.generated_by))

    const got = await (await fetch(`${BASE}/api/brief`, { headers: bearer })).json()
    check('GET returns probe brief as latest w/ provenance',
      got.brief?.id === posted.brief?.id && got.brief?.generated_by === PROBE_HARNESS,
      JSON.stringify({ id: got.brief?.id, by: got.brief?.generated_by }))

    const events = await db.select().from(activityLog).where(and(
      eq(activityLog.action, 'brief_published'), eq(activityLog.actorName, PROBE_HARNESS),
    ))
    check('exactly one brief_published activity event', events.length === 1, String(events.length))
    check('event carries comms family + harness session', events[0]?.eventFamily === 'comms' && events[0]?.workflowRunId === 'msgtest-session-1',
      JSON.stringify({ fam: events[0]?.eventFamily, run: events[0]?.workflowRunId }))

    const badBody = await fetch(`${BASE}/api/brief`, { method: 'POST', headers: bearer, body: JSON.stringify({}) })
    check('missing content → 400', badBody.status === 400, String(badBody.status))
  } finally {
    await sql`DELETE FROM briefs WHERE generated_by = ${PROBE_HARNESS}`
    await db.delete(activityLog).where(eq(activityLog.actorName, PROBE_HARNESS))
    const briefResidue = await sql`SELECT count(*) AS n FROM briefs WHERE generated_by = ${PROBE_HARNESS}`
    const actResidue = await db.select().from(activityLog).where(dsql`${activityLog.actorName} = ${PROBE_HARNESS}`)
    check('residual probe rows = 0', Number(briefResidue[0].n) === 0 && actResidue.length === 0,
      `briefs=${briefResidue[0].n} activity=${actResidue.length}`)
  }
  finish('probe M1 brief bearer/provenance')
}

main().catch((err) => { console.error(err); process.exit(1) })
