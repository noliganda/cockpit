import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userRows, userTables, userColumns } from '@/lib/db/schema'
import { eq, asc, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  // Full-text search using JSONB cast to text
  const rows = await db
    .select({
      rowId: userRows.id,
      tableId: userRows.tableId,
      data: userRows.data,
      createdAt: userRows.createdAt,
    })
    .from(userRows)
    .where(sql`${userRows.data}::text ILIKE ${'%' + q + '%'}`)
    .limit(50)

  if (rows.length === 0) return NextResponse.json({ results: [] })

  // Fetch table metadata for matched rows
  const tableIds = [...new Set(rows.map(r => r.tableId))]
  const [tables, allCols] = await Promise.all([
    db.select().from(userTables).where(
      tableIds.length === 1
        ? eq(userTables.id, tableIds[0])
        : sql`${userTables.id} = ANY(${sql.raw(`ARRAY[${tableIds.map(id => `'${id}'`).join(',')}]::uuid[]`)})`
    ),
    db.select().from(userColumns).where(
      tableIds.length === 1
        ? eq(userColumns.tableId, tableIds[0])
        : sql`${userColumns.tableId} = ANY(${sql.raw(`ARRAY[${tableIds.map(id => `'${id}'`).join(',')}]::uuid[]`)})`
    ).orderBy(asc(userColumns.sortOrder)),
  ])

  const tableMap = new Map(tables.map(t => [t.id, t]))
  const colsByTable = new Map<string, typeof allCols>()
  for (const col of allCols) {
    if (!colsByTable.has(col.tableId)) colsByTable.set(col.tableId, [])
    colsByTable.get(col.tableId)!.push(col)
  }

  const results = rows.map(row => {
    const table = tableMap.get(row.tableId)
    const cols = colsByTable.get(row.tableId) ?? []
    const data = row.data as Record<string, unknown>

    // Build a preview: first 3 columns with values
    const preview = cols.slice(0, 3)
      .map(c => ({ col: c.name, val: data[c.id] }))
      .filter(x => x.val !== undefined && x.val !== null && x.val !== '')

    return {
      rowId: row.rowId,
      tableId: row.tableId,
      tableName: table?.name ?? 'Unknown',
      preview,
      createdAt: row.createdAt,
    }
  })

  return NextResponse.json({ results, query: q })
}
