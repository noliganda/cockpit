import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { activityLog, logShareTokens } from '@/lib/db/schema'
import { desc, ilike, or, eq, and, isNotNull } from 'drizzle-orm'
import { LogsClient } from './logs-client'

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    entity?: string
    agent?: string
    type?: string
    actor_type?: string
    page?: string
    token?: string
  }>
}) {
  const { q, entity, agent, type, actor_type, page: pageStr, token } = await searchParams

  // Guest access via share token
  let guestEntity: string | null = null
  let guestLabel: string | null = null
  if (token) {
    const [shareToken] = await db
      .select()
      .from(logShareTokens)
      .where(and(eq(logShareTokens.token, token), eq(logShareTokens.active, true)))
      .limit(1)

    if (!shareToken || (shareToken.expiresAt && new Date(shareToken.expiresAt) < new Date())) {
      redirect('/login')
    }
    guestEntity = shareToken.entity
    guestLabel = shareToken.label
  } else {
    const session = await getSession()
    if (!session) redirect('/login')
  }

  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const limit = 50
  const offset = (page - 1) * limit

  // Build filters on canonical activity_log
  const filters = []
  if (guestEntity) {
    filters.push(eq(activityLog.entity, guestEntity))
  } else if (entity) {
    filters.push(eq(activityLog.entity, entity))
  }
  if (agent) filters.push(eq(activityLog.agentId, agent))
  if (type) filters.push(eq(activityLog.eventType, type))
  if (actor_type) filters.push(eq(activityLog.actorType, actor_type))
  if (q) {
    filters.push(
      or(
        ilike(activityLog.description, `%${q}%`),
        ilike(activityLog.action, `%${q}%`),
        ilike(activityLog.actor, `%${q}%`),
      )!
    )
  }

  const where = filters.length > 0 ? and(...filters) : undefined

  const [entries, eventTypes, agentIds, actorTypes] = await Promise.all([
    // Main query — select canonical fields
    db.select({
      id: activityLog.id,
      actor: activityLog.actor,
      actorType: activityLog.actorType,
      actorId: activityLog.actorId,
      actorName: activityLog.actorName,
      agentId: activityLog.agentId,
      action: activityLog.action,
      eventType: activityLog.eventType,
      eventFamily: activityLog.eventFamily,
      entityType: activityLog.entityType,
      entityTitle: activityLog.entityTitle,
      entity: activityLog.entity,
      description: activityLog.description,
      metadata: activityLog.metadata,
      category: activityLog.category,
      status: activityLog.status,
      sourceSystem: activityLog.sourceSystem,
      sourceUrl: activityLog.sourceUrl,
      apiCostUsd: activityLog.apiCostUsd,
      createdAt: activityLog.createdAt,
    })
      .from(activityLog)
      .where(where)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)
      .offset(offset),

    // Distinct event types for filter dropdown (exclude nulls)
    db.selectDistinct({ type: activityLog.eventType })
      .from(activityLog)
      .where(isNotNull(activityLog.eventType))
      .orderBy(activityLog.eventType),

    // Distinct agent IDs for filter dropdown (exclude nulls)
    db.selectDistinct({ agent: activityLog.agentId })
      .from(activityLog)
      .where(isNotNull(activityLog.agentId))
      .orderBy(activityLog.agentId),

    // Distinct actor types for filter dropdown
    db.selectDistinct({ actorType: activityLog.actorType })
      .from(activityLog)
      .orderBy(activityLog.actorType),
  ])

  return (
    <LogsClient
      entries={entries}
      eventTypes={eventTypes.map(e => e.type!)}
      agentIds={agentIds.map(a => a.agent!)}
      actorTypes={actorTypes.map(a => a.actorType)}
      currentFilters={{ q, entity: guestEntity ?? entity, agent, type, actor_type, page }}
      hasMore={entries.length === limit}
      isGuest={!!guestEntity}
      guestLabel={guestLabel}
    />
  )
}
