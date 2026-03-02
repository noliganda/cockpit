import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailStats } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'
import { getSession, getGuestSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  const guestSession = await getGuestSession()
  if (!session && !guestSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const workspace = searchParams.get('workspace')
  const days = parseInt(searchParams.get('days') ?? '30')

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceDate = since.toISOString().split('T')[0]

  const wsFilter = workspace ? eq(emailStats.workspace, workspace) : undefined
  const dateFilter = gte(emailStats.date, sinceDate)
  const where = wsFilter ? and(wsFilter, dateFilter) : dateFilter

  const rows = await db.select().from(emailStats).where(where)

  return NextResponse.json(rows)
}
