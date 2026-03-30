import { NextRequest, NextResponse } from 'next/server'
import { syncAllNotionDatabases } from '@/lib/notion-sync'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Controlled by env var — set NOTION_SYNC_ENABLED=false to disable
    if (process.env.NOTION_SYNC_ENABLED === 'false') {
      return NextResponse.json({ disabled: true, message: 'Notion sync is disabled via NOTION_SYNC_ENABLED env var.' })
    }

    const results = await syncAllNotionDatabases()
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('[GET /api/cron/notion-sync]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
