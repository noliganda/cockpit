import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { getSessionData } from '@/lib/auth'
import { z } from 'zod'

const patchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  updates: z.object({
    status: z.string().optional(),
    assignee: z.string().nullable().optional(),
    urgent: z.boolean().optional(),
    important: z.boolean().optional(),
    dueDate: z.string().nullable().optional(),
  }),
})

const deleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export async function PATCH(request: NextRequest) {
  const sessionData = await getSessionData()
  if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (sessionData.role === 'guest') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as unknown
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { ids, updates } = parsed.data
  const updated = await db
    .update(tasks)
    .set({ ...updates, updatedAt: new Date() })
    .where(inArray(tasks.id, ids))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest) {
  const sessionData = await getSessionData()
  if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (sessionData.role === 'guest') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as unknown
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { ids } = parsed.data
  await db.delete(tasks).where(inArray(tasks.id, ids))

  return NextResponse.json({ success: true, count: ids.length })
}
