import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userBases, userTables, userColumns, userRows } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Public route — no auth required, only accessible if isPublic = true
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    const [base] = await db
      .select()
      .from(userBases)
      .where(eq(userBases.shareToken, token))
      .limit(1)

    if (!base) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!base.isPublic) return NextResponse.json({ error: 'This base is not shared publicly' }, { status: 403 })

    const tables = await db.select().from(userTables).where(eq(userTables.baseId, base.id)).orderBy(userTables.createdAt)

    // Fetch columns + rows for all tables
    const tablesWithData = await Promise.all(
      tables.map(async (table) => {
        const columns = await db.select().from(userColumns).where(eq(userColumns.tableId, table.id)).orderBy(userColumns.order)
        const rows = await db.select().from(userRows).where(eq(userRows.tableId, table.id)).orderBy(userRows.createdAt)
        return { ...table, columns, rows }
      })
    )

    return NextResponse.json({
      id: base.id,
      name: base.name,
      description: base.description,
      tables: tablesWithData,
    })
  } catch (error) {
    console.error('[GET /api/tables/bases/share/[token]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
