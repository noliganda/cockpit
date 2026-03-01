import { NextRequest, NextResponse } from 'next/server'
import { exportToObsidian } from '@/lib/obsidian-export'
import { getSession } from '@/lib/auth'

const ALL_WORKSPACES = ['byron-film', 'korus', 'personal']

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await request.json() as { workspaceId: string }
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  if (workspaceId === 'all') {
    const results = await Promise.all(ALL_WORKSPACES.map(id => exportToObsidian(id)))
    return NextResponse.json({ success: true, results })
  }

  const result = await exportToObsidian(workspaceId)
  return NextResponse.json(result)
}
