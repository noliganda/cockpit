import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userRows } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const bulkSchema = z.object({
  create: z.array(z.object({ data: z.record(z.unknown()).default({}) })).optional(),
  update: z.array(z.object({ id: z.string().uuid(), data: z.record(z.unknown()) })).optional(),
  delete: z.array(z.string().uuid()).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tableId } = await params
  const body = await request.json() as unknown
  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { create, update, delete: del } = parsed.data
  const results: { created: unknown[]; updated: unknown[]; deleted: number } = {
    created: [],
    updated: [],
    deleted: 0,
  }

  if (create && create.length > 0) {
    const existing = await db
      .select({ sortOrder: userRows.sortOrder })
      .from(userRows)
      .where(eq(userRows.tableId, tableId))
    const maxOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), -1)

    const created = await db.insert(userRows).values(
      create.map((r, i) => ({ tableId, data: r.data, sortOrder: maxOrder + 1 + i }))
    ).returning()
    results.created = created
  }

  if (update && update.length > 0) {
    const updated: unknown[] = []
    for (const u of update) {
      const [existing] = await db.select().from(userRows).where(
        and(eq(userRows.id, u.id), eq(userRows.tableId, tableId))
      )
      if (existing) {
        const [row] = await db.update(userRows)
          .set({
            data: { ...(existing.data as Record<string, unknown>), ...u.data },
            updatedAt: new Date(),
          })
          .where(and(eq(userRows.id, u.id), eq(userRows.tableId, tableId)))
          .returning()
        updated.push(row)
      }
    }
    results.updated = updated
  }

  if (del && del.length > 0) {
    await db.delete(userRows).where(
      and(eq(userRows.tableId, tableId), inArray(userRows.id, del))
    )
    results.deleted = del.length
  }

  return NextResponse.json(results)
}
