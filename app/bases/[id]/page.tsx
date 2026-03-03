import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { userTables, userColumns, userRows, userBases } from '@/lib/db/schema'
import { eq, asc, sql } from 'drizzle-orm'
import { TableEditorClient } from './table-editor-client'

export type ColumnDef = {
  id: string
  name: string
  fieldType: string
  options: Record<string, unknown> | null
  sortOrder: number
  required: boolean
  defaultValue: string | null
}

export type RowData = {
  id: string
  data: Record<string, unknown>
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export default async function TableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id: tableId } = await params

  const [table] = await db.select().from(userTables).where(eq(userTables.id, tableId))
  if (!table) redirect('/bases')

  const [base] = await db.select().from(userBases).where(eq(userBases.id, table.baseId))

  const [cols, rowsData, countResult] = await Promise.all([
    db.select().from(userColumns).where(eq(userColumns.tableId, tableId)).orderBy(asc(userColumns.sortOrder), asc(userColumns.createdAt)),
    db.select().from(userRows).where(eq(userRows.tableId, tableId)).orderBy(asc(userRows.sortOrder), asc(userRows.createdAt)).limit(50),
    db.select({ count: sql<number>`count(*)::int` }).from(userRows).where(eq(userRows.tableId, tableId)),
  ])

  const columns: ColumnDef[] = cols.map(c => ({
    id: c.id,
    name: c.name,
    fieldType: c.fieldType,
    options: c.options as Record<string, unknown> | null,
    sortOrder: c.sortOrder ?? 0,
    required: c.required ?? false,
    defaultValue: c.defaultValue,
  }))

  const rows: RowData[] = rowsData.map(r => ({
    id: r.id,
    data: r.data as Record<string, unknown>,
    sortOrder: r.sortOrder ?? 0,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return (
    <TableEditorClient
      tableId={tableId}
      tableName={table.name}
      baseName={base?.name ?? 'Unknown'}
      baseId={table.baseId}
      initialColumns={columns}
      initialRows={rows}
      totalRows={countResult[0]?.count ?? 0}
    />
  )
}
