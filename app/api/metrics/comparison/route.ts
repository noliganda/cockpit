import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { actions } from '@/lib/db/schema'
import { gte } from 'drizzle-orm'
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

    const allActions = await db.select().from(actions).where(
      gte(actions.createdAt, since)
    )

    const workspaces = ['byron-film', 'personal', 'korus']

    const comparison = workspaces.map(ws => {
      const wsActions = allActions.filter(a => a.workspace === ws)
      const totalActions = wsActions.length
      const automated = wsActions.filter(a => !a.humanIntervention).length
      const automationRate = totalActions > 0 ? (automated / totalActions) * 100 : 0
      const minutesSaved = wsActions.reduce((s, a) =>
        s + ((a.estimatedManualMinutes ?? 0) - (a.durationMinutes ?? 0)), 0)
      const hoursSaved = minutesSaved / 60
      const apiCost = wsActions.reduce((s, a) => s + (a.apiCostUsd ?? 0), 0)
      const roi = hoursSaved * 75 - apiCost

      // Multiplier = estimated manual hours / actual AI hours
      const totalAiMins = wsActions.reduce((s, a) => s + (a.durationMinutes ?? 0), 0)
      const totalManualMins = wsActions.reduce((s, a) => s + (a.estimatedManualMinutes ?? 0), 0)
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

    // Key deltas — Byron Film vs KORUS
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
