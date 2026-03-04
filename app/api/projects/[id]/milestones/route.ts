import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { milestones } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const rows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, id))
      .orderBy(asc(milestones.date))

    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/projects/[id]/milestones]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json() as { title?: string; date?: string; status?: string }

    if (!body.title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const [milestone] = await db
      .insert(milestones)
      .values({
        projectId: id,
        title: body.title,
        date: body.date ?? null,
        status: body.status ?? 'pending',
      })
      .returning()

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    console.error('[POST /api/projects/[id]/milestones]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
