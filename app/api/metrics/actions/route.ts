import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { actions, activityLog } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { workspaceToEntity } from '@/types'

// POST /api/metrics/actions — log a new productivity action
// Dual-write: legacy `actions` table + canonical `activity_log`
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      workspace,
      category,
      description,
      outcome,
      durationMinutes,
      estimatedManualMinutes,
      humanIntervention = false,
      interventionType,
      apiCostUsd = 0,
      apiTokensUsed = 0,
      apiModel,
      metadata,
    } = body

    if (!workspace || !category || !description) {
      return NextResponse.json({ error: 'workspace, category, description are required' }, { status: 400 })
    }

    // Write to legacy actions table (backward compat)
    const [row] = await db.insert(actions).values({
      workspace,
      category,
      description,
      outcome,
      durationMinutes,
      estimatedManualMinutes,
      humanIntervention,
      interventionType,
      apiCostUsd,
      apiTokensUsed,
      apiModel,
      metadata,
    }).returning()

    // Dual-write to canonical activity_log
    await logActivity({
      workspaceId: workspace,
      actor: 'system',
      action: 'reported_action',
      entityType: 'action',
      entityId: row.id,
      description,
      metadata: { ...(metadata as Record<string, unknown> ?? {}), outcome },
      entity: workspaceToEntity(workspace),
      actorType: 'system',
      eventFamily: inferEventFamilyFromCategory(category),
      category,
      sourceSystem: 'api',
      status: 'success',
      durationMinutes,
      estimatedManualMinutes,
      humanIntervention,
      interventionType,
      apiCostUsd,
      apiTokensUsed,
      apiModel,
    })

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error('[POST /api/metrics/actions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/metrics/actions — read from canonical activity_log
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    const { getGuestSession } = await import('@/lib/auth')
    const guestSession = await getGuestSession()
    if (!session && !guestSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const workspace = searchParams.get('workspace')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    const { eq, desc, isNotNull, and } = await import('drizzle-orm')

    const filters = [isNotNull(activityLog.category)]
    if (workspace) filters.push(eq(activityLog.workspaceId, workspace))

    const rows = await db.select({
      id: activityLog.id,
      workspaceId: activityLog.workspaceId,
      category: activityLog.category,
      description: activityLog.description,
      durationMinutes: activityLog.durationMinutes,
      estimatedManualMinutes: activityLog.estimatedManualMinutes,
      humanIntervention: activityLog.humanIntervention,
      interventionType: activityLog.interventionType,
      apiCostUsd: activityLog.apiCostUsd,
      apiTokensUsed: activityLog.apiTokensUsed,
      apiModel: activityLog.apiModel,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
    })
      .from(activityLog)
      .where(and(...filters))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)

    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/metrics/actions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function inferEventFamilyFromCategory(category: string): string {
  const map: Record<string, string> = {
    email: 'email',
    research: 'research',
    admin: 'system',
    development: 'deployment',
    coordination: 'workflow',
    finance: 'finance',
    marketing: 'marketing',
    sales: 'crm',
    operations: 'workflow',
    recruitment: 'crm',
    legal: 'system',
    creative: 'marketing',
    support: 'system',
    infrastructure: 'deployment',
  }
  return map[category] ?? 'system'
}
