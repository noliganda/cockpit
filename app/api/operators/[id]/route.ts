import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { operators, activityLog } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSessionData } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['active', 'paused']).optional(),
  pauseReason: z.string().optional(),
  budgetMonthlyCents: z.number().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionData()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const data = parsed.data
    const updates: Partial<typeof operators._inferModel> = {}
    if (data.status) {
      updates.status = data.status
      if (data.status === 'active') updates.pausedAt = null
      if (data.status === 'paused') updates.pausedAt = new Date()
    }
    if (data.pauseReason !== undefined) {
      updates.pauseReason = data.pauseReason
    }
    if (data.budgetMonthlyCents !== undefined) {
      updates.budgetMonthlyCents = data.budgetMonthlyCents
    }

    const [updated] = await db.update(operators)
      .set(updates)
      .where(eq(operators.id, id))
      .returning()

    // Log the operator update
    await db.insert(activityLog).values({
      workspaceId: Array.isArray(updated.workspaceScope)
        ? updated.workspaceScope[0] ?? ''
        : updated.workspaceScope || '',
      actor: session.userId,
      action: 'update',
      entityType: 'operator',
      entityId: id,
      entityTitle: updated.name,
      eventType: 'operator_updated',
      actorType: 'human',
      actorId: session.userId,
      actorName: session.userName,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/operators/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
