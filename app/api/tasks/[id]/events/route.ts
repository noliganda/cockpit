import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { taskEvents } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const events = await db
      .select()
      .from(taskEvents)
      .where(eq(taskEvents.taskId, id))
      .orderBy(desc(taskEvents.createdAt))

    return NextResponse.json(events)
  } catch (error) {
    console.error('[GET /api/tasks/[id]/events]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
