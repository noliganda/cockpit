import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { dispatchState } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSessionData } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'

// ── Dispatch soft pause toggle ───────────────────────────────────────────────
// POST /api/dispatch/pause  { "paused": true|false }
// DB-backed (shared Neon), so flipping it from the prod dashboard stops/starts
// dispatch cycles on the host that actually runs the engine. Layered UNDER the
// per-host DISPATCH_ENABLED gate; pause stops new dispatches only (stale
// reclamation + cascade bookkeeping keep running). Guests are 403'd.

const bodySchema = z.object({ paused: z.boolean() })

export async function POST(request: NextRequest) {
  try {
    const sessionData = await getSessionData()
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Not authenticated. Send Authorization: Bearer $COCKPIT_API_TOKEN.', code: 'unauthorized' },
        { status: 401 },
      )
    }
    if (sessionData.role === 'guest') {
      return NextResponse.json({ error: 'Guests cannot toggle dispatch.', code: 'forbidden' }, { status: 403 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format(), code: 'validation_error' }, { status: 400 })
    }
    const { paused } = parsed.data
    const actor = sessionData.harnessName ?? sessionData.email

    await db.insert(dispatchState).values({ id: 'singleton' }).onConflictDoNothing()
    const [state] = await db
      .update(dispatchState)
      .set({
        paused,
        pausedAt: paused ? new Date() : null,
        pausedBy: paused ? actor : null,
        updatedAt: new Date(),
      })
      .where(eq(dispatchState.id, 'singleton'))
      .returning()

    await logActivity({
      workspaceId: 'personal',
      actor,
      action: paused ? 'dispatch_paused' : 'dispatch_resumed',
      entityType: 'system',
      entityId: 'dispatch-engine',
      entityTitle: 'Dispatch engine',
      description: `Dispatching ${paused ? 'PAUSED' : 'resumed'} by ${actor}`,
      actorType: sessionData.harnessName ? 'agent' : 'human',
      actorName: actor,
      eventFamily: 'agent',
      eventType: paused ? 'dispatch_paused' : 'dispatch_resumed',
      sourceSystem: sessionData.harnessName ? 'api' : 'dashboard',
      status: 'success',
    })

    return NextResponse.json({ success: true, paused: state.paused, pausedAt: state.pausedAt, pausedBy: state.pausedBy })
  } catch (error) {
    console.error('[POST /api/dispatch/pause]', error)
    return NextResponse.json({ error: 'Internal server error', code: 'server_error' }, { status: 500 })
  }
}
