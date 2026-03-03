import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userTables, userColumns, userRows } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'json'

  const [[table], cols, rows] = await Promise.all([
    db.select().from(userTables).where(eq(userTables.id, tableId)),
    db.select().from(userColumns).where(eq(userColumns.tableId, tableId)).orderBy(asc(userColumns.sortOrder)),
    db.select().from(userRows).where(eq(userRows.tableId, tableId)).orderBy(asc(userRows.sortOrder), asc(userRows.createdAt)),
  ])

  if (!table) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const baseName = table.name.toLowerCase().replace(/\s+/g, '-')
  const date = new Date().toISOString().slice(0, 10)
  const filename = `${baseName}-${date}`

  if (format === 'json') {
    const data = rows.map(r => ({
      id: r.id,
      ...(r.data as Record<string, unknown>),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
    return new NextResponse(JSON.stringify({ table: table.name, columns: cols, rows: data }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
      },
    })
  }

  if (format === 'csv') {
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }
    const header = cols.map(c => esc(c.name)).join(',')
    const body = rows
      .map(r => {
        const data = r.data as Record<string, unknown>
        return cols.map(c => esc(data[c.id])).join(',')
      })
      .join('\n')
    return new NextResponse(header + '\n' + body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  }

  // Markdown (default)
  const now = new Date().toISOString()
  const yamlCols = cols.map(c => `  - name: ${c.name}\n    type: ${c.fieldType}`).join('\n')

  const mdHeader = `---\ntable: ${table.name}\nexported: ${now}\ncolumns:\n${yamlCols}\n---\n\n# ${table.name}\n\n`

  const separator = cols.map(c => '-'.repeat(Math.max(c.name.length, 4))).join(' | ')
  const tableHeader = `| ${cols.map(c => c.name).join(' | ')} |\n| ${separator} |`

  const tableRows = rows.map(r => {
    const data = r.data as Record<string, unknown>
    const cells = cols.map(c => {
      const val = data[c.id]
      if (c.fieldType === 'checkbox') return val ? '✅' : '❌'
      return String(val ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
    })
    return `| ${cells.join(' | ')} |`
  })

  const md = mdHeader + tableHeader + '\n' + tableRows.join('\n')

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.md"`,
    },
  })
}
