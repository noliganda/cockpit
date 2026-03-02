import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTableFields, getTableRows } from '@/lib/nocodb'
import { TableDetailClient } from './base-detail-client'

export default async function TableDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ base?: string; name?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id: tableId } = await params
  const { base: baseId, name: tableName } = await searchParams

  if (!baseId) redirect('/bases')

  const [fields, rowsData] = await Promise.all([
    getTableFields(tableId),
    getTableRows(baseId, tableId, { limit: 50 }),
  ])

  return (
    <TableDetailClient
      tableId={tableId}
      baseId={baseId}
      tableName={tableName ?? tableId}
      initialFields={fields}
      initialRows={rowsData.list}
      initialPageInfo={rowsData.pageInfo}
    />
  )
}
