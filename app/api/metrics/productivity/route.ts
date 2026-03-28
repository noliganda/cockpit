import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activityLog, baselines, emailStats } from '@/lib/db/schema'
import { eq, and, gte, isNotNull } from 'drizzle-orm'
import { getSession, getGuestSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    const guestSession = await getGuestSession()
    if (!session && !guestSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const workspace = searchParams.get('workspace') // optional filter
    const days = parseInt(searchParams.get('days') ?? '90')

    const since = new Date()
    since.setDate(since.getDate() - days)

    // Query canonical activity_log for productivity-relevant events (category IS NOT NULL)
    const wsFilter = workspace && workspace !== 'all'
      ? eq(activityLog.workspaceId, workspace)
      : undefined

    const dateFilter = gte(activityLog.createdAt, since)
    const categoryFilter = isNotNull(activityLog.category)
    const where = wsFilter ? and(wsFilter, dateFilter, categoryFilter) : and(dateFilter, categoryFilter)

    const [allEvents, allBaselines, allEmailStats] = await Promise.all([
      db.select({
        workspaceId: activityLog.workspaceId,
        category: activityLog.category,
        durationMinutes: activityLog.durationMinutes,
        estimatedManualMinutes: activityLog.estimatedManualMinutes,
        humanIntervention: activityLog.humanIntervention,
        interventionType: activityLog.interventionType,
        apiCostUsd: activityLog.apiCostUsd,
        createdAt: activityLog.createdAt,
      }).from(activityLog).where(where),
      db.select().from(baselines),
      db.select().from(emailStats).where(
        gte(emailStats.date, since.toISOString().split('T')[0])
      ),
    ])

    const workspaces = ['korus', 'byron-film', 'personal']

    const byWorkspace = workspaces.map(ws => {
      const wsEvents = allEvents.filter(a => a.workspaceId === ws)
      const totalActions = wsEvents.length
      const automatedActions = wsEvents.filter(a => !a.humanIntervention).length
      const automationRate = totalActions > 0 ? (automatedActions / totalActions) * 100 : 0

      const totalDurationMins = wsEvents.reduce((s, a) => s + (a.durationMinutes ?? 0), 0)
      const totalManualMins = wsEvents.reduce((s, a) => s + (a.estimatedManualMinutes ?? 0), 0)
      const minutesSaved = totalManualMins - totalDurationMins
      const hoursSaved = minutesSaved / 60

      const totalApiCost = wsEvents.reduce((s, a) => s + (a.apiCostUsd ?? 0), 0)
      const roi = hoursSaved * 75 - totalApiCost

      const categories: Record<string, { count: number; minutesSaved: number; apiCost: number }> = {}
      for (const a of wsEvents) {
        const cat = a.category ?? 'uncategorised'
        if (!categories[cat]) categories[cat] = { count: 0, minutesSaved: 0, apiCost: 0 }
        categories[cat].count++
        categories[cat].minutesSaved += (a.estimatedManualMinutes ?? 0) - (a.durationMinutes ?? 0)
        categories[cat].apiCost += a.apiCostUsd ?? 0
      }

      const interventions: Record<string, number> = {}
      for (const a of wsEvents.filter(a => a.humanIntervention && a.interventionType)) {
        const t = a.interventionType!
        interventions[t] = (interventions[t] ?? 0) + 1
      }

      const weeklySeries: { week: string; count: number; minutesSaved: number; apiCost: number }[] = []
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)
        const weekActions = wsEvents.filter(a => {
          const d = new Date(a.createdAt)
          return d >= weekStart && d < weekEnd
        })
        weeklySeries.push({
          week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
          count: weekActions.length,
          minutesSaved: weekActions.reduce((s, a) => s + (a.estimatedManualMinutes ?? 0) - (a.durationMinutes ?? 0), 0),
          apiCost: weekActions.reduce((s, a) => s + (a.apiCostUsd ?? 0), 0),
        })
      }

      return {
        workspace: ws,
        totalActions,
        automationRate: Math.round(automationRate * 10) / 10,
        hoursSaved: Math.round(hoursSaved * 10) / 10,
        totalApiCostUsd: Math.round(totalApiCost * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        categories: Object.entries(categories).map(([cat, v]) => ({ category: cat, ...v })),
        interventions,
        weeklySeries,
      }
    })

    const emailByWorkspace = workspaces.map(ws => {
      const wsEmail = allEmailStats.filter(e => e.workspace === ws)
      return {
        workspace: ws,
        totalSent: wsEmail.reduce((s, e) => s + (e.emailsSent ?? 0), 0),
        totalReceived: wsEmail.reduce((s, e) => s + (e.emailsReceived ?? 0), 0),
        autonomousResponses: wsEmail.reduce((s, e) => s + (e.autonomousResponses ?? 0), 0),
        escalated: wsEmail.reduce((s, e) => s + (e.escalated ?? 0), 0),
        avgResponseTimeMins: wsEmail.length > 0
          ? wsEmail.reduce((s, e) => s + (e.avgResponseTimeMinutes ?? 0), 0) / wsEmail.filter(e => e.avgResponseTimeMinutes).length || null
          : null,
      }
    })

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      byWorkspace,
      emailByWorkspace,
      baselines: allBaselines,
    })
  } catch (error) {
    console.error('[GET /api/metrics/productivity]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
