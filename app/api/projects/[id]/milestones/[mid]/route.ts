import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { milestones } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; mid: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { mid } = await params
    const body = await request.json() as { title?: string; date?: string; status?: string }

    const [milestone] = await db
      .update(milestones)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(milestones.id, mid))
      .returning()

    if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(milestone)
  } catch (error) {
    console.error('[PATCH /api/projects/[id]/milestones/[mid]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; mid: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { mid } = await params

    await db.delete(milestones).where(eq(milestones.id, mid))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/projects/[id]/milestones/[mid]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
