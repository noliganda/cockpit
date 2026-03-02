import { db } from '@/lib/db'
import { actions, emailStats } from '@/lib/db/schema'
import { gte } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { ProductivityClient } from './productivity-client'

const WS_META: Record<string, { label: string; color: string; systems: string[] }> = {
  'byron-film': {
    label: 'Byron Film',
    color: '#3B82F6',
    systems: ['Gmail', 'Notion', 'CRM', 'Xero', 'Google Drive'],
  },
  personal: {
    label: 'Personal',
    color: '#10B981',
    systems: ['Gmail', 'Calendar', 'Google Drive'],
  },
  korus: {
    label: 'KORUS',
    color: '#F97316',
    systems: ['Notion (read-only)', 'Dashboard'],
  },
}

const HOURLY_RATE = 75

function buildWeeklySeries(wsActions: { createdAt: Date; durationMinutes: number | null; estimatedManualMinutes: number | null; apiCostUsd: number | null }[], weeks = 12) {
  const now = new Date()
  return Array.from({ length: weeks }, (_, i) => {
    const weekOffset = weeks - 1 - i
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekOffset * 7 - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const weekActions = wsActions.filter(a => {
      const d = new Date(a.createdAt)
      return d >= weekStart && d < weekEnd
    })

    return {
      week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      count: weekActions.length,
      minutesSaved: weekActions.reduce((s, a) => s + ((a.estimatedManualMinutes ?? 0) - (a.durationMinutes ?? 0)), 0),
      apiCost: weekActions.reduce((s, a) => s + (a.apiCostUsd ?? 0), 0),
    }
  })
}

export default async function ProductivityPage() {
  // Auth check — main session or guest session
  const cookieStore = await cookies()
  const mainSession = cookieStore.get('ops-session')?.value
  const guestSession = cookieStore.get('ops-guest-session')?.value

  if (!mainSession && !guestSession) {
    return <GuestLogin />
  }

  const since = new Date()
  since.setDate(since.getDate() - 90)
  const sinceDate = since.toISOString().split('T')[0]

  const [allActions, allEmailStats] = await Promise.all([
    db.select().from(actions).where(gte(actions.createdAt, since)),
    db.select().from(emailStats).where(gte(emailStats.date, sinceDate)),
  ])

  const workspaces = ['byron-film', 'personal', 'korus']

  const byWorkspace = workspaces.map(ws => {
    const wsMeta = WS_META[ws]
    const wsActions = allActions.filter(a => a.workspace === ws)
    const wsEmail = allEmailStats.filter(e => e.workspace === ws)

    const totalActions = wsActions.length
    const automated = wsActions.filter(a => !a.humanIntervention).length
    const automationRate = totalActions > 0 ? (automated / totalActions) * 100 : 0

    const totalDurationMins = wsActions.reduce((s, a) => s + (a.durationMinutes ?? 0), 0)
    const totalManualMins = wsActions.reduce((s, a) => s + (a.estimatedManualMinutes ?? 0), 0)
    const minutesSaved = totalManualMins - totalDurationMins
    const hoursSaved = minutesSaved / 60
    const totalApiCost = wsActions.reduce((s, a) => s + (a.apiCostUsd ?? 0), 0)
    const roi = hoursSaved * HOURLY_RATE - totalApiCost

    const multiplier = totalDurationMins > 0
      ? Math.round((totalManualMins / totalDurationMins) * 10) / 10
      : null

    // Category breakdown
    const catMap: Record<string, { count: number; minutesSaved: number; apiCost: number }> = {}
    for (const a of wsActions) {
      if (!catMap[a.category]) catMap[a.category] = { count: 0, minutesSaved: 0, apiCost: 0 }
      catMap[a.category].count++
      catMap[a.category].minutesSaved += (a.estimatedManualMinutes ?? 0) - (a.durationMinutes ?? 0)
      catMap[a.category].apiCost += a.apiCostUsd ?? 0
    }

    // Intervention breakdown
    const interventions: Record<string, number> = {}
    for (const a of wsActions) {
      if (a.humanIntervention && a.interventionType) {
        interventions[a.interventionType] = (interventions[a.interventionType] ?? 0) + 1
      }
    }

    return {
      workspace: ws,
      label: wsMeta.label,
      color: wsMeta.color,
      systems: wsMeta.systems,
      totalActions,
      automationRate: Math.round(automationRate * 10) / 10,
      hoursSaved: Math.round(hoursSaved * 10) / 10,
      totalApiCostUsd: Math.round(totalApiCost * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      multiplier,
      categories: Object.entries(catMap).map(([category, v]) => ({ category, ...v })),
      interventions,
      weeklySeries: buildWeeklySeries(wsActions),
      emailSent: wsEmail.reduce((s, e) => s + (e.emailsSent ?? 0), 0),
      emailAutonomous: wsEmail.reduce((s, e) => s + (e.autonomousResponses ?? 0), 0),
      emailEscalated: wsEmail.reduce((s, e) => s + (e.escalated ?? 0), 0),
    }
  })

  return <ProductivityClient byWorkspace={byWorkspace} />
}

function GuestLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <div className="w-10 h-10 rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] flex items-center justify-center mx-auto mb-3 text-lg">📊</div>
          <h1 className="text-xl font-bold text-[#F5F5F5]">Productivity Dashboard</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">AI Operations · COPIL Board View</p>
        </div>
        <form action="/api/auth/guest" method="post" className="space-y-4">
          <input
            type="password"
            name="password"
            placeholder="Access password"
            className="w-full px-4 py-3 rounded-[8px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm font-medium hover:bg-[#222222] transition-all"
          >
            Access Dashboard
          </button>
        </form>
      </div>
    </div>
  )
}
