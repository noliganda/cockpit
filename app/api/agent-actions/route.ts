import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/db/schema'
import { desc, eq, and, gte, lte, ilike, or, sql } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { entityToWorkspace } from '@/types'

/** Best-effort mapping from agent action_type to event_family */
function inferEventFamily(actionType: string): string {
  if (actionType.startsWith('email')) return 'email'
  if (actionType.startsWith('invoice') || actionType.startsWith('expense')) return 'finance'
  if (actionType.startsWith('proposal') || actionType.startsWith('lead') || actionType.startsWith('outreach')) return 'crm'
  if (actionType.startsWith('content') || actionType.startsWith('marketing')) return 'marketing'
  if (actionType.startsWith('code') || actionType.startsWith('deploy') || actionType.startsWith('system')) return 'deployment'
  if (actionType.startsWith('research')) return 'research'
  if (actionType.startsWith('task') || actionType.startsWith('sprint')) return 'task'
  if (actionType.startsWith('morning_brief')) return 'system'
  return 'agent'
}

// GET /api/agent-actions — query agent actions with filters
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const entity = searchParams.get('entity')
  const agentId = searchParams.get('agent')
  const actionType = searchParams.get('type')
  const q = searchParams.get('q')
  const since = searchParams.get('since') // ISO date
  const until = searchParams.get('until') // ISO date
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const filters = []
  if (entity) filters.push(eq(agentActions.entity, entity))
  if (agentId) filters.push(eq(agentActions.agentId, agentId))
  if (actionType) filters.push(eq(agentActions.actionType, actionType))
  if (since) filters.push(gte(agentActions.createdAt, new Date(since)))
  if (until) filters.push(lte(agentActions.createdAt, new Date(until)))
  if (q) {
    filters.push(
      or(
        ilike(agentActions.description, `%${q}%`),
        ilike(agentActions.actionType, `%${q}%`),
        ilike(agentActions.agentId, `%${q}%`),
      )!
    )
  }

  const where = filters.length > 0 ? and(...filters) : undefined

  const [rows, countResult] = await Promise.all([
    db.select()
      .from(agentActions)
      .where(where)
      .orderBy(desc(agentActions.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(agentActions)
      .where(where),
  ])

  return NextResponse.json({
    actions: rows,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  })
}

// POST /api/agent-actions — log a new agent action
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    agentId: string
    actionType: string
    entity: string
    description?: string
    metadata?: unknown
    costUsd?: number
    sourceUrl?: string
  }

  if (!body.agentId || !body.actionType || !body.entity) {
    return NextResponse.json({ error: 'agentId, actionType, and entity are required' }, { status: 400 })
  }

  const [row] = await db.insert(agentActions).values({
    agentId: body.agentId,
    actionType: body.actionType,
    entity: body.entity,
    description: body.description ?? null,
    metadata: body.metadata ?? null,
    costUsd: body.costUsd?.toString() ?? null,
    sourceUrl: body.sourceUrl ?? null,
  }).returning()

  // Dual-write into canonical activity_log (Phase 2 — OPS v5)
  const workspaceId = entityToWorkspace(body.entity) ?? 'personal'
  await logActivity({
    workspaceId,
    actor: body.agentId,
    action: body.actionType,
    entityType: 'agent_action',
    entityId: row.id,
    description: body.description,
    metadata: body.metadata as Record<string, unknown> | undefined,
    entity: body.entity,
    actorType: 'agent',
    actorId: body.agentId,
    agentId: body.agentId,
    eventFamily: inferEventFamily(body.actionType),
    eventType: body.actionType,
    sourceSystem: 'api',
    sourceUrl: body.sourceUrl,
    status: 'success',
    apiCostUsd: body.costUsd,
  })

  return NextResponse.json(row, { status: 201 })
}
