import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projectContacts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; pcid: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pcid } = await params

    await db.delete(projectContacts).where(eq(projectContacts.id, pcid))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/projects/[id]/contacts/[pcid]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
