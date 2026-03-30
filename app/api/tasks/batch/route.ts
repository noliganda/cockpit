import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { getSessionData } from '@/lib/auth'
import { z } from 'zod'
import { getChildCount } from '@/lib/task-hierarchy'
import { applyParentRollup } from '@/lib/task-hierarchy'

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
  try {
    const sessionData = await getSessionData()
    if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (sessionData.role === 'guest') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as unknown
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const { ids, updates } = parsed.data

    // Fetch tasks being updated to identify subtasks that need parent rollup
    const affectedTasks = await db
      .select({ id: tasks.id, parentTaskId: tasks.parentTaskId })
      .from(tasks)
      .where(inArray(tasks.id, ids))

    const updated = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(inArray(tasks.id, ids))
      .returning()

    // If status was changed, trigger rollup for affected parents
    if (updates.status) {
      const parentIds = new Set<string>()
      for (const t of affectedTasks) {
        if (t.parentTaskId) parentIds.add(t.parentTaskId)
      }
      for (const parentId of parentIds) {
        await applyParentRollup(parentId, 'batch')
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/tasks/batch]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionData = await getSessionData()
    if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (sessionData.role === 'guest') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as unknown
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const { ids } = parsed.data

    // Block deletion of parents with children
    const blockedParents: string[] = []
    for (const id of ids) {
      const count = await getChildCount(id)
      if (count > 0) blockedParents.push(id)
    }
    if (blockedParents.length > 0) {
      return NextResponse.json({
        error: `${blockedParents.length} task(s) have subtasks and cannot be deleted. Delete or reassign subtasks first.`,
        blockedIds: blockedParents,
      }, { status: 409 })
    }

    // Collect parent IDs for rollup after deletion
    const toDelete = await db
      .select({ id: tasks.id, parentTaskId: tasks.parentTaskId })
      .from(tasks)
      .where(inArray(tasks.id, ids))
    const parentIds = new Set<string>()
    for (const t of toDelete) {
      if (t.parentTaskId) parentIds.add(t.parentTaskId)
    }

    await db.delete(tasks).where(inArray(tasks.id, ids))

    // Rollup affected parents
    for (const parentId of parentIds) {
      await applyParentRollup(parentId, 'batch')
    }

    return NextResponse.json({ success: true, count: ids.length })
  } catch (error) {
    console.error('[DELETE /api/tasks/batch]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
