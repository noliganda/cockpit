import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getSessionData } from '@/lib/auth'
import { listWorkspaces } from '@/lib/workspaces'

// Shared-bearer model: any authenticated caller gets the full scope set.
// (When real scoped tokens land, scopes will come from the token record.)
const ALL_SCOPES = ['tasks:read', 'tasks:write', 'events:write'] as const
const GUEST_SCOPES = ['tasks:read'] as const

/**
 * GET /api/whoami — the first call any harness should make.
 * Verifies auth, reports identity + provenance (harness/model/session),
 * allowed scopes, and validates an optional `?workspace=<id>` hint.
 * Fails fast with an actionable 401 if the bearer token is missing/wrong.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionData()
    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
          error:
            'Not authenticated. Send "Authorization: Bearer $COCKPIT_API_TOKEN" (the shared Cockpit bearer), or sign in to the dashboard.',
          code: 'unauthorized',
        },
        { status: 401 },
      )
    }

    const h = await headers()
    const authMethod = h.get('authorization')?.startsWith('Bearer ') ? 'bearer' : 'cookie'

    const allWorkspaces = await listWorkspaces()
    const validWorkspaceIds = allWorkspaces.map((w) => w.id)

    // Validate an optional workspace hint so a harness can confirm its target in one call.
    const workspaceId = request.nextUrl.searchParams.get('workspace')
    let workspace: { id: string; valid: boolean } | null = null
    if (workspaceId) {
      workspace = { id: workspaceId, valid: validWorkspaceIds.includes(workspaceId) }
    }

    const scopes = session.role === 'guest' ? GUEST_SCOPES : ALL_SCOPES

    return NextResponse.json({
      authenticated: true,
      authMethod,
      identity: {
        userId: session.userId,
        email: session.email,
        role: session.role,
        harnessName: session.harnessName ?? null,
        executingModel: session.harnessModel ?? null,
        sessionId: session.harnessSessionId ?? null,
      },
      scopes,
      workspace,
      validWorkspaceIds,
      serverTime: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[GET /api/whoami]', error)
    return NextResponse.json({ error: 'Internal server error', code: 'server_error' }, { status: 500 })
  }
}
