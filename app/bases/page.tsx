import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { bases, baseRows } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { BasesClient } from './bases-client'
import { type BaseColumn } from '@/types'

export default async function BasesPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const allBases = await db
    .select()
    .from(bases)
    .where(eq(bases.workspaceId, workspaceId))

  const rowCounts = await db
    .select({ baseId: baseRows.baseId, count: sql<number>`count(*)::int` })
    .from(baseRows)
    .groupBy(baseRows.baseId)

  const countMap = Object.fromEntries(rowCounts.map(r => [r.baseId, r.count]))
  const basesWithCounts = allBases.map(b => ({
    ...b,
    schema: (b.schema ?? []) as BaseColumn[],
    rowCount: countMap[b.id] ?? 0,
  }))

  return <BasesClient key={workspaceId} initialBases={basesWithCounts} workspaceId={workspaceId as 'byron-film' | 'korus' | 'personal'} />
}
