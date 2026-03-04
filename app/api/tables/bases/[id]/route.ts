import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userBases, userTables } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [base] = await db.select().from(userBases).where(eq(userBases.id, id))
  if (!base) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tables = await db.select().from(userTables).where(eq(userTables.baseId, id)).orderBy(userTables.createdAt)
  return NextResponse.json({ ...base, tables })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, description, workspace } = body

  const [base] = await db
    .update(userBases)
    .set({ name, description, workspace, updatedAt: new Date() })
    .where(eq(userBases.id, id))
    .returning()

  if (!base) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(base)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(userBases).where(eq(userBases.id, id))
  return NextResponse.json({ ok: true })
}
