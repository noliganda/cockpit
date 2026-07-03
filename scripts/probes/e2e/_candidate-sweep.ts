// Live-candidate safety sweep: every real task the engine would consider,
// with its readiness verdict. Read-only. Run before leaving the engine live.
import '../_probe-env'

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks } = await import('@/lib/db/schema')
  const { evaluateReadiness } = await import('@/lib/dispatch/readiness')
  const { and, inArray } = await import('drizzle-orm')

  const candidates = await db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status, workspaceId: tasks.workspaceId, assigneeId: tasks.assigneeId, assigneeType: tasks.assigneeType })
    .from(tasks)
    .where(and(inArray(tasks.status, ['Backlog', 'To Do']), inArray(tasks.assigneeType, ['agent', 'function'])))

  if (candidates.length === 0) {
    console.log('SWEEP: zero dispatch candidates — engine can safely run live.')
  } else {
    for (const c of candidates) {
      const readiness = await evaluateReadiness(c.id)
      console.log(JSON.stringify({ ...c, ready: readiness.ready, blockers: readiness.blockers }))
    }
  }
}
main().then(() => process.exit(0))
