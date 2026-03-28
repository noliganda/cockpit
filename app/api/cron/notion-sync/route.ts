import { NextRequest, NextResponse } from 'next/server'
import { syncAllNotionDatabases } from '@/lib/notion-sync'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = await syncAllNotionDatabases()
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('[GET /api/cron/notion-sync]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
