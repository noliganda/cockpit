import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userTables, userColumns } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const columnSchema = z.object({
  name: z.string().min(1),
  fieldType: z.string().default('text'),
  options: z.record(z.unknown()).optional(),
  required: z.boolean().optional(),
})

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  columns: z.array(columnSchema).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ baseId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { baseId } = await params
  const tables = await db
    .select()
    .from(userTables)
    .where(eq(userTables.baseId, baseId))
    .orderBy(asc(userTables.sortOrder), asc(userTables.createdAt))

  return NextResponse.json(tables)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ baseId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { baseId } = await params
  const body = await request.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { columns: colDefs, ...tableData } = parsed.data
  const [table] = await db.insert(userTables).values({ ...tableData, baseId }).returning()

  // Insert initial columns if provided
  if (colDefs && colDefs.length > 0) {
    await db.insert(userColumns).values(
      colDefs.map((col, i) => ({
        tableId: table.id,
        name: col.name,
        fieldType: col.fieldType,
        options: col.options ?? null,
        required: col.required ?? false,
        sortOrder: i,
      }))
    )
  } else {
    // Default: add a "Name" text column
    await db.insert(userColumns).values({
      tableId: table.id,
      name: 'Name',
      fieldType: 'text',
      sortOrder: 0,
    })
  }

  return NextResponse.json(table, { status: 201 })
}
