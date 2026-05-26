import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { listWorkspaces } from '@/lib/workspaces'

/**
 * GET /api/workspaces — discovery endpoint for harnesses.
 * Returns the canonical workspace IDs so nobody has to guess (`bf` vs
 * `byron-film`, etc.). Use the `id` field as `workspaceId` on task writes.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated. Send Authorization: Bearer $COCKPIT_API_TOKEN.', code: 'unauthorized' },
        { status: 401 },
      )
    }
    const workspaces = await listWorkspaces()
    return NextResponse.json({ workspaces })
  } catch (error) {
    console.error('[GET /api/workspaces]', error)
    return NextResponse.json({ error: 'Internal server error', code: 'server_error' }, { status: 500 })
  }
}
