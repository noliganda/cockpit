import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activityLog } from '@/lib/db/schema'
import { gte, and, isNotNull } from 'drizzle-orm'
import { getSession, getGuestSession } from '@/lib/auth'

const ACCESS_LEVELS: Record<string, { label: string; systems: string[]; color: string }> = {
  'byron-film': {
    label: 'Byron Film',
    color: '#3B82F6',
    systems: ['Gmail', 'Notion', 'CRM', 'Xero', 'Google Drive', 'Calendar'],
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

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    const guestSession = await getGuestSession()
    if (!session && !guestSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const days = parseInt(searchParams.get('days') ?? '90')

    const since = new Date()
    since.setDate(since.getDate() - days)

    // Query canonical activity_log for productivity-relevant events
    const allEvents = await db.select({
      workspaceId: activityLog.workspaceId,
      durationMinutes: activityLog.durationMinutes,
      estimatedManualMinutes: activityLog.estimatedManualMinutes,
      humanIntervention: activityLog.humanIntervention,
      apiCostUsd: activityLog.apiCostUsd,
    }).from(activityLog).where(and(
      gte(activityLog.createdAt, since),
      isNotNull(activityLog.category),
    ))

    const workspaces = ['byron-film', 'personal', 'korus']

    const comparison = workspaces.map(ws => {
      const wsEvents = allEvents.filter(a => a.workspaceId === ws)
      const totalActions = wsEvents.length
      const automated = wsEvents.filter(a => !a.humanIntervention).length
      const automationRate = totalActions > 0 ? (automated / totalActions) * 100 : 0
      const minutesSaved = wsEvents.reduce((s, a) =>
        s + ((a.estimatedManualMinutes ?? 0) - (a.durationMinutes ?? 0)), 0)
      const hoursSaved = minutesSaved / 60
      const apiCost = wsEvents.reduce((s, a) => s + (a.apiCostUsd ?? 0), 0)
      const roi = hoursSaved * 75 - apiCost

      const totalAiMins = wsEvents.reduce((s, a) => s + (a.durationMinutes ?? 0), 0)
      const totalManualMins = wsEvents.reduce((s, a) => s + (a.estimatedManualMinutes ?? 0), 0)
      const multiplier = totalAiMins > 0 ? totalManualMins / totalAiMins : null

      return {
        workspace: ws,
        ...ACCESS_LEVELS[ws],
        totalActions,
        automationRate: Math.round(automationRate * 10) / 10,
        hoursSaved: Math.round(hoursSaved * 10) / 10,
        apiCostUsd: Math.round(apiCost * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        multiplier: multiplier ? Math.round(multiplier * 10) / 10 : null,
      }
    })

    const bf = comparison.find(c => c.workspace === 'byron-film')!
    const korus = comparison.find(c => c.workspace === 'korus')!
    const deltas = {
      automationRateDelta: bf.automationRate - korus.automationRate,
      hoursSavedDelta: bf.hoursSaved - korus.hoursSaved,
      roiDelta: bf.roi - korus.roi,
    }

    return NextResponse.json({ comparison, deltas, period: { days } })
  } catch (error) {
    console.error('[GET /api/metrics/comparison]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
