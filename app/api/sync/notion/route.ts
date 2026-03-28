import { NextResponse } from 'next/server'
import { syncAllNotionDatabases } from '@/lib/notion-sync'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    return NextResponse.json({ status: 'ready', message: 'POST to trigger sync' })
  } catch (error) {
    console.error('[GET /api/sync/notion]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const results = await syncAllNotionDatabases()
    return NextResponse.json({ success: true, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
