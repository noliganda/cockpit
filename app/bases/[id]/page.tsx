import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { bases, baseRows } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { BaseDetailClient } from './base-detail-client'

export default async function BaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const [base] = await db.select().from(bases).where(eq(bases.id, id)).limit(1)
  if (!base) notFound()

  const rawRows = await db.select().from(baseRows).where(eq(baseRows.baseId, id)).orderBy(asc(baseRows.createdAt))
  const rows = rawRows.map(r => ({ ...r, data: (r.data ?? {}) as Record<string, unknown> }))

  return <BaseDetailClient base={base} initialRows={rows} workspaceId={workspaceId as 'byron-film' | 'korus' | 'personal'} />
}
