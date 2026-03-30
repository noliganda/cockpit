import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { operators } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let query = db.select().from(operators)

    if (status) {
      query = query.where(eq(operators.status, status)) as typeof query
    }
    if (type) {
      query = query.where(eq(operators.operatorType, type)) as typeof query
    }

    const rows = await query
    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/operators]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
