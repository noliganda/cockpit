import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { aiMetrics, tasks } from '@/lib/db/schema'
import { desc, eq, gte, and } from 'drizzle-orm'
import { AIMetricsClient } from './ai-metrics-client'

export default async function AIMetricsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Get last 90 days of metrics
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [allMetrics, recentTasks] = await Promise.all([
    db.select().from(aiMetrics).orderBy(desc(aiMetrics.periodStart)).limit(100),
    db.select().from(tasks)
      .where(and(
        eq(tasks.workspaceId, 'byron-film'),
        gte(tasks.createdAt, ninetyDaysAgo)
      ))
      .orderBy(desc(tasks.createdAt))
      .limit(200),
  ])

  return <AIMetricsClient initialMetrics={allMetrics} recentTasks={recentTasks} />
}
