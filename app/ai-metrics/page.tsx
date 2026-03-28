import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { activityLog, aiMetrics, tasks } from '@/lib/db/schema'
import { desc, eq, gte, and, isNotNull } from 'drizzle-orm'
import { AIMetricsClient } from './ai-metrics-client'

export default async function AIMetricsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [agentEvents, manualEntries, recentTasks] = await Promise.all([
    // Canonical activity_log: all events with an agent_id in last 90 days
    db.select({
      id: activityLog.id,
      agentId: activityLog.agentId,
      actorType: activityLog.actorType,
      eventType: activityLog.eventType,
      eventFamily: activityLog.eventFamily,
      category: activityLog.category,
      entity: activityLog.entity,
      description: activityLog.description,
      status: activityLog.status,
      sourceSystem: activityLog.sourceSystem,
      apiCostUsd: activityLog.apiCostUsd,
      apiModel: activityLog.apiModel,
      apiTokensUsed: activityLog.apiTokensUsed,
      humanIntervention: activityLog.humanIntervention,
      interventionType: activityLog.interventionType,
      durationMinutes: activityLog.durationMinutes,
      estimatedManualMinutes: activityLog.estimatedManualMinutes,
      approvalStatus: activityLog.approvalStatus,
      createdAt: activityLog.createdAt,
    })
      .from(activityLog)
      .where(and(
        isNotNull(activityLog.agentId),
        gte(activityLog.createdAt, ninetyDaysAgo),
      ))
      .orderBy(desc(activityLog.createdAt)),

    // Keep ai_metrics manual entries for supplementary display
    db.select().from(aiMetrics).orderBy(desc(aiMetrics.periodStart)).limit(100),

    // Recent tasks for the task log section
    db.select().from(tasks)
      .where(and(
        eq(tasks.workspaceId, 'byron-film'),
        gte(tasks.createdAt, ninetyDaysAgo),
      ))
      .orderBy(desc(tasks.createdAt))
      .limit(200),
  ])

  // ── Compute live stats from canonical agent events ──────────────────────
  const totalEvents = agentEvents.length
  const totalCost = agentEvents.reduce((s, e) => s + (e.apiCostUsd ?? 0), 0)
  const totalTokens = agentEvents.reduce((s, e) => s + (e.apiTokensUsed ?? 0), 0)
  const interventionCount = agentEvents.filter(e => e.humanIntervention).length
  const automationRate = totalEvents > 0 ? ((totalEvents - interventionCount) / totalEvents) * 100 : 0
  const interventionRate = totalEvents > 0 ? (interventionCount / totalEvents) * 100 : 0

  // Per-agent breakdown
  const agentMap: Record<string, { count: number; cost: number; interventions: number }> = {}
  for (const e of agentEvents) {
    const aid = e.agentId!
    if (!agentMap[aid]) agentMap[aid] = { count: 0, cost: 0, interventions: 0 }
    agentMap[aid].count++
    agentMap[aid].cost += e.apiCostUsd ?? 0
    if (e.humanIntervention) agentMap[aid].interventions++
  }
  const agentBreakdown = Object.entries(agentMap)
    .map(([agentId, v]) => ({ agentId, ...v }))
    .sort((a, b) => b.count - a.count)

  // Per-event-family breakdown
  const familyMap: Record<string, number> = {}
  for (const e of agentEvents) {
    const fam = e.eventFamily ?? 'unknown'
    familyMap[fam] = (familyMap[fam] ?? 0) + 1
  }
  const familyBreakdown = Object.entries(familyMap)
    .map(([family, count]) => ({ family, count }))
    .sort((a, b) => b.count - a.count)

  // Daily time-series for charts (last 90 days)
  const dailyMap: Record<string, { count: number; cost: number }> = {}
  for (const e of agentEvents) {
    const day = new Date(e.createdAt).toISOString().slice(0, 10)
    if (!dailyMap[day]) dailyMap[day] = { count: 0, cost: 0 }
    dailyMap[day].count++
    dailyMap[day].cost += e.apiCostUsd ?? 0
  }
  const dailySeries = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date: date.slice(5), count: v.count, cost: Math.round(v.cost * 100) / 100 }))

  // Per-entity breakdown
  const entityMap: Record<string, number> = {}
  for (const e of agentEvents) {
    const ent = e.entity ?? 'shared'
    entityMap[ent] = (entityMap[ent] ?? 0) + 1
  }
  const entityBreakdown = Object.entries(entityMap)
    .map(([entity, count]) => ({ entity, count }))
    .sort((a, b) => b.count - a.count)

  const liveStats = {
    totalEvents,
    totalCost: Math.round(totalCost * 100) / 100,
    totalTokens,
    automationRate: Math.round(automationRate * 10) / 10,
    interventionRate: Math.round(interventionRate * 10) / 10,
    interventionCount,
    costPerEvent: totalEvents > 0 ? Math.round((totalCost / totalEvents) * 1000) / 1000 : 0,
  }

  return (
    <AIMetricsClient
      liveStats={liveStats}
      agentBreakdown={agentBreakdown}
      familyBreakdown={familyBreakdown}
      entityBreakdown={entityBreakdown}
      dailySeries={dailySeries}
      manualEntries={manualEntries}
      recentTasks={recentTasks}
    />
  )
}
