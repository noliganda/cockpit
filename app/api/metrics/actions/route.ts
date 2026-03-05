import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { actions } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      workspace,
      category,
      description,
      outcome,
      durationMinutes,
      estimatedManualMinutes,
      humanIntervention = false,
      interventionType,
      apiCostUsd = 0,
      apiTokensUsed = 0,
      apiModel,
      metadata,
    } = body

    if (!workspace || !category || !description) {
      return NextResponse.json({ error: 'workspace, category, description are required' }, { status: 400 })
    }

    const [row] = await db.insert(actions).values({
      workspace,
      category,
      description,
      outcome,
      durationMinutes,
      estimatedManualMinutes,
      humanIntervention,
      interventionType,
      apiCostUsd,
      apiTokensUsed,
      apiModel,
      metadata,
    }).returning()

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error('[POST /api/metrics/actions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    const { getGuestSession } = await import('@/lib/auth')
    const guestSession = await getGuestSession()
    if (!session && !guestSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const workspace = searchParams.get('workspace')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    const { eq, desc } = await import('drizzle-orm')
    const rows = await db.select().from(actions)
      .where(workspace ? eq(actions.workspace, workspace) : undefined)
      .orderBy(desc(actions.createdAt))
      .limit(limit)

    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/metrics/actions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
