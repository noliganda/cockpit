import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

// Read-only Rolodex: contacts are owned by Twenty (Baïkal → Twenty → Cockpit) and
// mirrored in by the inbound sync. Cockpit never creates a person — no POST here.
// Cockpit-local edits (notes/tags only) go through PATCH /api/contacts/[id].
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace')

    const rows = await db
      .select()
      .from(contacts)
      .where(workspaceId ? eq(contacts.workspaceId, workspaceId) : undefined)
      .orderBy(desc(contacts.createdAt))

    return NextResponse.json(rows)
  } catch (error) {
    console.error('[GET /api/contacts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
