import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userColumns } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  fieldType: z.string().default('text'),
  options: z.record(z.unknown()).optional(),
  required: z.boolean().optional(),
  defaultValue: z.string().optional(),
  sortOrder: z.number().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const cols = await db
    .select()
    .from(userColumns)
    .where(eq(userColumns.tableId, tableId))
    .orderBy(asc(userColumns.sortOrder), asc(userColumns.createdAt))

  return NextResponse.json(cols)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const body = await request.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  // Get next sort order
  const existing = await db
    .select({ sortOrder: userColumns.sortOrder })
    .from(userColumns)
    .where(eq(userColumns.tableId, tableId))

  const maxOrder = existing.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), -1)

  const [col] = await db.insert(userColumns).values({
    tableId,
    name: parsed.data.name,
    fieldType: parsed.data.fieldType,
    options: parsed.data.options ?? null,
    required: parsed.data.required ?? false,
    defaultValue: parsed.data.defaultValue,
    sortOrder: parsed.data.sortOrder ?? maxOrder + 1,
  }).returning()

  return NextResponse.json(col, { status: 201 })
}
