import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { commItems, tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { apiHandler } from '@/lib/api-handler'
import { getSessionData } from '@/lib/auth'

const patchSchema = z.object({
  draftStatus: z.enum(['awaiting-review', 'sent', 'dismissed']).nullable().optional(),
  linkedTaskId: z.string().uuid().nullable().optional(),
}).refine((d) => d.draftStatus !== undefined || d.linkedTaskId !== undefined, {
  message: 'Provide draftStatus and/or linkedTaskId',
})

/** Status updates only (spec §4) — e.g. the PA marks a reviewed draft `sent`. */
export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const sessionData = await getSessionData()
  if (!sessionData) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  if (sessionData.role === 'guest') {
    return NextResponse.json({ error: 'Forbidden: guests cannot update messages', code: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid id', code: 'validation_error' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format(), code: 'validation_error' }, { status: 400 })
  }

  if (parsed.data.linkedTaskId) {
    const [task] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, parsed.data.linkedTaskId)).limit(1)
    if (!task) return NextResponse.json({ error: 'linkedTaskId does not exist', code: 'not_found' }, { status: 422 })
  }

  const updates: Partial<typeof commItems.$inferInsert> = { updatedAt: new Date() }
  if (parsed.data.draftStatus !== undefined) updates.draftStatus = parsed.data.draftStatus
  if (parsed.data.linkedTaskId !== undefined) updates.linkedTaskId = parsed.data.linkedTaskId

  const [updated] = await db.update(commItems).set(updates).where(eq(commItems.id, id)).returning()
  if (!updated) return NextResponse.json({ error: 'Message not found', code: 'not_found' }, { status: 404 })

  return NextResponse.json({ item: updated })
})
