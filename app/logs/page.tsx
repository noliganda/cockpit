import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { activityLog } from '@/lib/db/schema'
import { desc, ilike, or, eq, and } from 'drizzle-orm'
import { LogsClient } from './logs-client'

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; workspace?: string; type?: string; page?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { q, workspace, type, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const limit = 50
  const offset = (page - 1) * limit

  const filters = []
  if (workspace) filters.push(eq(activityLog.workspaceId, workspace))
  if (type) filters.push(eq(activityLog.entityType, type))
  if (q) {
    filters.push(
      or(
        ilike(activityLog.entityTitle, `%${q}%`),
        ilike(activityLog.description, `%${q}%`),
        ilike(activityLog.action, `%${q}%`),
        ilike(activityLog.actor, `%${q}%`),
      )!
    )
  }

  const where = filters.length > 0 ? and(...filters) : undefined

  const [entries, entityTypes] = await Promise.all([
    db.select({
      id: activityLog.id,
      workspaceId: activityLog.workspaceId,
      actor: activityLog.actor,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      entityTitle: activityLog.entityTitle,
      description: activityLog.description,
      metadata: activityLog.metadata,
      hasEmbedding: activityLog.embeddingModel,
      createdAt: activityLog.createdAt,
    })
    .from(activityLog)
    .where(where)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
    .offset(offset),

    // Get distinct entity types for filter
    db.selectDistinct({ type: activityLog.entityType })
      .from(activityLog)
      .orderBy(activityLog.entityType),
  ])

  return (
    <LogsClient
      entries={entries}
      entityTypes={entityTypes.map(e => e.type)}
      currentFilters={{ q, workspace, type, page }}
      hasMore={entries.length === limit}
    />
  )
}
