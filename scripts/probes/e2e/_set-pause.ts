// Set/clear the dispatch soft-pause directly in the shared DB.
// Usage: npx tsx scripts/probes/e2e/_set-pause.ts on|off
import '../_probe-env'

async function main() {
  const { db } = await import('@/lib/db')
  const { dispatchState } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const on = process.argv[2] === 'on'
  await db.insert(dispatchState).values({ id: 'singleton' }).onConflictDoNothing()
  await db.update(dispatchState)
    .set({ paused: on, pausedAt: on ? new Date() : null, pausedBy: on ? 'ops-run-safety' : null, updatedAt: new Date() })
    .where(eq(dispatchState.id, 'singleton'))
  const [s] = await db.select().from(dispatchState).where(eq(dispatchState.id, 'singleton'))
  console.log(JSON.stringify({ paused: s.paused, pausedBy: s.pausedBy }))
}
main().then(() => process.exit(0))
