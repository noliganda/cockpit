import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { actions, baselines, emailStats } from '@/lib/db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { getSession, getGuestSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
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
  const sinceStr = since.toISOString()

  // Build workspace filter
  const wsFilter = workspace && workspace !== 'all'
    ? eq(actions.workspace, workspace)
    : undefined

  const dateFilter = gte(actions.createdAt, new Date(sinceStr))
  const where = wsFilter ? and(wsFilter, dateFilter) : dateFilter

  const [allActions, allBaselines, allEmailStats] = await Promise.all([
    db.select().from(actions).where(where),
    db.select().from(baselines),
    db.select().from(emailStats).where(
      gte(emailStats.date, since.toISOString().split('T')[0])
    ),
  ])

  // --- Per-workspace aggregation ---
  const workspaces = ['korus', 'byron-film', 'personal']

  const byWorkspace = workspaces.map(ws => {
    const wsActions = allActions.filter(a => a.workspace === ws)
    const totalActions = wsActions.length
    const automatedActions = wsActions.filter(a => !a.humanIntervention).length
    const automationRate = totalActions > 0 ? (automatedActions / totalActions) * 100 : 0

    const totalDurationMins = wsActions.reduce((s, a) => s + (a.durationMinutes ?? 0), 0)
    const totalManualMins = wsActions.reduce((s, a) => s + (a.estimatedManualMinutes ?? 0), 0)
    const minutesSaved = totalManualMins - totalDurationMins
    const hoursSaved = minutesSaved / 60

    const totalApiCost = wsActions.reduce((s, a) => s + (a.apiCostUsd ?? 0), 0)
    const defaultRate = 75
    const roi = hoursSaved * defaultRate - totalApiCost

    // Category breakdown
    const categories: Record<string, { count: number; minutesSaved: number; apiCost: number }> = {}
    for (const a of wsActions) {
      if (!categories[a.category]) categories[a.category] = { count: 0, minutesSaved: 0, apiCost: 0 }
      categories[a.category].count++
      categories[a.category].minutesSaved += (a.estimatedManualMinutes ?? 0) - (a.durationMinutes ?? 0)
      categories[a.category].apiCost += a.apiCostUsd ?? 0
    }

    // Intervention type breakdown
    const interventions: Record<string, number> = {}
    for (const a of wsActions.filter(a => a.humanIntervention && a.interventionType)) {
      const t = a.interventionType!
      interventions[t] = (interventions[t] ?? 0) + 1
    }

    // Weekly time series (last 12 weeks)
    const weeklySeries: { week: string; count: number; minutesSaved: number; apiCost: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const weekActions = wsActions.filter(a => {
        const d = new Date(a.createdAt)
        return d >= weekStart && d < weekEnd
      })
      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
      weeklySeries.push({
        week: label,
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

  // Email stats per workspace
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
    period: { days, since: sinceStr },
    byWorkspace,
    emailByWorkspace,
    baselines: allBaselines,
  })
}
