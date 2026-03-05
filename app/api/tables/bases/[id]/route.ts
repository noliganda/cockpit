import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userBases, userTables } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { randomBytes } from 'crypto'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const [base] = await db.select().from(userBases).where(eq(userBases.id, id))
    if (!base) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const tables = await db.select().from(userTables).where(eq(userTables.baseId, id)).orderBy(userTables.createdAt)
    return NextResponse.json({ ...base, tables })
  } catch (error) {
    console.error('[GET /api/tables/bases/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { name, description, workspace, areaId, projectId, isPublic, generateShareToken } = body

    // If enabling sharing and no token yet, generate one
    let shareToken: string | undefined
    if (generateShareToken) {
      shareToken = randomBytes(16).toString('hex')
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (workspace !== undefined) updateData.workspace = workspace
    if (areaId !== undefined) updateData.areaId = areaId
    if (projectId !== undefined) updateData.projectId = projectId
    if (isPublic !== undefined) updateData.isPublic = isPublic
    if (shareToken) updateData.shareToken = shareToken

    const [base] = await db
      .update(userBases)
      .set(updateData)
      .where(eq(userBases.id, id))
      .returning()

    if (!base) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(base)
  } catch (error) {
    console.error('[PATCH /api/tables/bases/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await db.delete(userBases).where(eq(userBases.id, id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/tables/bases/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
