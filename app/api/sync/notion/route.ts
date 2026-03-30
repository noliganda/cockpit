import { NextResponse } from 'next/server'
import { syncAllNotionDatabases } from '@/lib/notion-sync'
import { getSession } from '@/lib/auth'

export async function GET() {
  return NextResponse.json({ 
    status: 'ready', 
    enabled: process.env.NOTION_SYNC_ENABLED !== 'false',
    message: 'POST to trigger sync' 
  })
}

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (process.env.NOTION_SYNC_ENABLED === 'false') {
    return NextResponse.json({ 
      disabled: true, 
      message: 'Notion sync is disabled. Set NOTION_SYNC_ENABLED=true in Vercel environment variables to re-enable.' 
    })
  }

  try {
    const results = await syncAllNotionDatabases()
    return NextResponse.json({ success: true, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
