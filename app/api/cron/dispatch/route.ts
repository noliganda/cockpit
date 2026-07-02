import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, dispatchState } from '@/lib/db/schema'
import { and, gt, isNotNull, eq } from 'drizzle-orm'
import { runDispatchCycle } from '@/lib/dispatch/engine'
import { cascadeOnCompletion } from '@/lib/dispatch/cascade'

// ── Dispatch cycle poller (spec §6.1) ────────────────────────────────────────
// Cron-invoked. Gated by DISPATCH_ENABLED because adapters spawn LOCAL harness
// processes (hermes CLI etc.) — on Vercel serverless those binaries don't exist,
// so the deployed cron is a safe no-op until the flag is set on a host that has
// them (or a local poller curls this route on the Mini). Mirrors the
// NOTION_SYNC_ENABLED pattern.
//
// Before dispatching, runs the watermark cascade: any task whose completedAt
// passed since the last cycle gets cascadeOnCompletion() — this catches
// completions that bypassed the API PATCH path (direct DB edits, other
// systems). cascade is idempotent (coalesced wakeups don't re-log), so
// overlapping with the inline PATCH-path cascade is harmless.

const WATERMARK_ID = 'singleton'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (process.env.DISPATCH_ENABLED !== 'true') {
      return NextResponse.json({ disabled: true, reason: 'DISPATCH_ENABLED is not "true" on this host' })
    }

    const now = new Date()
    const [state] = await db.select().from(dispatchState).where(eq(dispatchState.id, WATERMARK_ID)).limit(1)

    // Watermark cascade. First run (null watermark) just initializes to now —
    // the dependency graph is newer than all historical completions.
    let cascaded = 0
    if (state?.lastCascadeAt) {
      const completedSince = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(isNotNull(tasks.completedAt), gt(tasks.completedAt, state.lastCascadeAt)))
      for (const t of completedSince) {
        await cascadeOnCompletion(t.id)
        cascaded++
      }
    }

    const summary = await runDispatchCycle()

    await db
      .update(dispatchState)
      .set({ lastCascadeAt: now, lastCycleAt: now, updatedAt: now })
      .where(eq(dispatchState.id, WATERMARK_ID))

    return NextResponse.json({ success: true, cascaded, ...summary })
  } catch (error) {
    console.error('[GET /api/cron/dispatch]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
