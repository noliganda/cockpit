import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSessionData } from '@/lib/auth'
import { dispatchTaskById } from '@/lib/dispatch/engine'
import { evaluateReadiness } from '@/lib/dispatch/readiness'

// ── Manual dispatch trigger (spec §6.2) ──────────────────────────────────────
// POST /api/tasks/[id]/dispatch — dispatch one task outside the cron cycle.
// ?force=true (or {"force": true}) bypasses the readiness gate but NEVER the
// hard guards: terminal/in-progress/unknown status, live session, missing
// operator/adapter, and concurrency limits all still refuse — force must not
// mean double-dispatch. Every dispatch is logged with a forced flag.
//
// Unlike the cron route, this is NOT gated by DISPATCH_ENABLED: it only runs
// where someone explicitly asked for a dispatch, and the adapters themselves
// fail cleanly on hosts without the target CLIs.

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionData = await getSessionData()
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Not authenticated. Send Authorization: Bearer $COCKPIT_API_TOKEN.', code: 'unauthorized' },
        { status: 401 },
      )
    }
    if (sessionData.role === 'guest') {
      return NextResponse.json({ error: 'Guests cannot dispatch tasks.', code: 'forbidden' }, { status: 403 })
    }

    const { id } = await params
    const [task] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!task) {
      return NextResponse.json({ error: 'Task not found.', code: 'not_found' }, { status: 404 })
    }

    let force = request.nextUrl.searchParams.get('force') === 'true'
    try {
      const body = (await request.json()) as { force?: boolean } | null
      if (body && typeof body.force === 'boolean') force = body.force
    } catch { /* empty body is fine */ }

    // Surface blockers explicitly on the non-forced path so callers see WHY.
    if (!force) {
      const readiness = await evaluateReadiness(id)
      if (!readiness.ready) {
        return NextResponse.json(
          { error: 'Task is not ready to dispatch.', code: 'not_ready', blockers: readiness.blockers },
          { status: 409 },
        )
      }
    }

    const actorName = sessionData.harnessName ?? sessionData.email ?? 'manual-dispatch'
    const outcome = await dispatchTaskById(id, { force, actorName: `manual:${actorName}` })

    if (outcome.outcome === 'dispatched') {
      return NextResponse.json({ success: true, forced: force, ...outcome })
    }
    if (outcome.outcome === 'failed') {
      return NextResponse.json({ error: outcome.reason, code: 'dispatch_failed', ...outcome }, { status: 502 })
    }
    return NextResponse.json(
      { error: outcome.reason, code: 'not_dispatchable', blockers: outcome.blockers ?? [outcome.reason] },
      { status: 409 },
    )
  } catch (error) {
    console.error('[POST /api/tasks/[id]/dispatch]', error)
    return NextResponse.json({ error: 'Internal server error', code: 'server_error' }, { status: 500 })
  }
}
