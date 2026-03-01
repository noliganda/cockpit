import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bases } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const [base] = await db.select().from(bases).where(eq(bases.id, id)).limit(1)
  if (!base) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(base)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json() as Partial<typeof bases.$inferInsert>

  const [base] = await db
    .update(bases)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(bases.id, id))
    .returning()

  if (!base) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(base)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.delete(bases).where(eq(bases.id, id))
  return NextResponse.json({ success: true })
}
