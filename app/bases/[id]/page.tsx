import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTable, getTableRows } from '@/lib/nocodb'
import { TableDetailClient } from './table-detail-client'

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
  const { base: baseId = '', name: tableName = '' } = await searchParams

  let columns: Array<{ id: string; title: string; uidt: string; system?: boolean }> = []
  let initialRows: Record<string, unknown>[] = []
  let totalRows = 0
  let error: string | null = null

  try {
    const [table, rowsData] = await Promise.all([
      getTable(tableId),
      baseId
        ? getTableRows(baseId, tableId)
        : Promise.resolve({
            list: [],
            pageInfo: { totalRows: 0, page: 1, pageSize: 50, isFirstPage: true, isLastPage: true },
          }),
    ])
    columns = table.columns.filter(c => !c.system)
    initialRows = rowsData.list
    totalRows = rowsData.pageInfo.totalRows
  } catch (err) {
    console.error('Failed to fetch table data:', err)
    error = 'Failed to load table data. Check NocoDB connection.'
  }

  return (
    <TableDetailClient
      tableId={tableId}
      baseId={baseId}
      tableName={tableName || tableId}
      columns={columns}
      initialRows={initialRows}
      totalRows={totalRows}
      error={error}
    />
  )
}
