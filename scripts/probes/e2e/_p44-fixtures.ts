// P4.4 screenshot fixtures: populate the dispatch panel with representative
// rows ([E2E-TEST] namespaced), or clean them with `cleanup` arg.
import '../_probe-env'
import { TEST_PREFIX } from '../_probe-env'

async function main() {
  const { db } = await import('@/lib/db')
  const { tasks, operators, agentWakeupRequests, agentTaskSessions } = await import('@/lib/db/schema')
  const { like, inArray } = await import('drizzle-orm')

  const opIds = ['probe-p44-writer', 'probe-p44-paused']
  if (process.argv[2] === 'cleanup') {
    const testTasks = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    const ids = testTasks.map(t => t.id)
    if (ids.length) {
      await db.delete(agentWakeupRequests).where(inArray(agentWakeupRequests.taskId, ids))
      await db.delete(agentTaskSessions).where(inArray(agentTaskSessions.taskId, ids))
      await db.delete(tasks).where(inArray(tasks.id, ids))
    }
    await db.delete(operators).where(inArray(operators.id, opIds))
    const residue = await db.select({ id: tasks.id }).from(tasks).where(like(tasks.title, `${TEST_PREFIX}%`))
    console.log(`cleanup done, residual=${residue.length}`)
    return
  }

  await db.insert(operators).values([
    { id: opIds[0], name: `${TEST_PREFIX} Research Writer`, operatorType: 'agent', status: 'active', adapterType: 'hermes-oneshot', maxConcurrent: 3, activeRunCount: 1 },
    { id: opIds[1], name: `${TEST_PREFIX} Budget-Capped Agent`, operatorType: 'agent', status: 'paused', pauseReason: 'budget_exceeded', adapterType: 'hermes-delegate', budgetMonthlyCents: 5000, spentMonthlyCents: 5250, maxConcurrent: 1 },
  ])
  const mk = async (title: string, workspaceId: string) => {
    const [t] = await db.insert(tasks).values({
      workspaceId, title: `${TEST_PREFIX} ${title}`, status: 'To Do', assigneeType: 'agent', assigneeId: opIds[0], sourceType: 'api',
    }).returning()
    return t
  }
  const a = await mk('Summarise supplier quotes for fit-out tender', 'korus')
  const b = await mk('Draft shoot-day call sheet from production notes', 'byron-film')
  const c = await mk('Weekly inbox triage report', 'personal')
  await db.insert(agentWakeupRequests).values([
    { operatorId: opIds[0], taskId: a.id, source: 'dependency_cascade', payload: {}, status: 'queued' },
    { operatorId: opIds[0], taskId: b.id, source: 'dispatch_cycle', payload: {}, status: 'running', claimedAt: new Date(Date.now() - 2 * 60_000) },
    { operatorId: opIds[0], taskId: c.id, source: 'task_assigned', payload: {}, status: 'claimed', claimedAt: new Date(Date.now() - 9 * 60_000) },
  ])
  const [session] = await db.insert(agentTaskSessions).values({
    operatorId: opIds[0], taskId: b.id, adapterType: 'hermes-oneshot', status: 'active', sessionDisplayId: 'hermes-20260703-a41f', lastCheckpointAt: new Date(Date.now() - 60_000),
  }).returning()
  console.log('fixtures created', { a: a.id, b: b.id, c: c.id, session: session.id })
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1) })
