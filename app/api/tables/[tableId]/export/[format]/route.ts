import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userColumns, userRows, userTables } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tableId: string; format: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tableId, format } = await params

    if (!['csv', 'json', 'md'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format. Use csv, json, or md.' }, { status: 400 })
    }

    const [table] = await db.select().from(userTables).where(eq(userTables.id, tableId))
    if (!table) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const columns = await db
      .select()
      .from(userColumns)
      .where(eq(userColumns.tableId, tableId))
      .orderBy(userColumns.order)

    const { rows } = await db
      .select()
      .from(userRows)
      .where(eq(userRows.tableId, tableId))
      .orderBy(userRows.createdAt)
      .then((rows) => ({ rows }))

    const filename = `${table.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
    const rowData = rows.map((r) => r.data as Record<string, unknown>)

    if (format === 'json') {
      const out = rowData.map((row) => {
        const obj: Record<string, unknown> = {}
        for (const col of columns) {
          obj[col.name] = row[col.id] ?? null
        }
        return obj
      })
      return new NextResponse(JSON.stringify(out, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      })
    }

    if (format === 'csv') {
      const escape = (v: unknown) => {
        const s = v == null ? '' : String(v)
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      }
      const header = columns.map((c) => escape(c.name)).join(',')
      const body = rowData.map((row) =>
        columns.map((col) => escape(row[col.id])).join(',')
      )
      const csv = [header, ...body].join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    }

    // md — Obsidian-compatible markdown with YAML frontmatter
    const lines: string[] = [
      '---',
      `title: "${table.name}"`,
      `table_id: "${tableId}"`,
      `columns: ${columns.map((c) => c.name).join(', ')}`,
      `exported: "${new Date().toISOString()}"`,
      '---',
      '',
      `# ${table.name}`,
      '',
    ]

    // Markdown table header
    lines.push(`| # | ${columns.map((c) => c.name).join(' | ')} |`)
    lines.push(`| --- | ${columns.map(() => '---').join(' | ')} |`)

    rowData.forEach((row, i) => {
      const cells = columns.map((col) => {
        const val = row[col.id]
        return val == null ? '' : String(val).replace(/\|/g, '\\|')
      })
      lines.push(`| ${i + 1} | ${cells.join(' | ')} |`)
    })

    const md = lines.join('\n')
    return new NextResponse(md, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${filename}.md"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/tables/[tableId]/export/[format]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
