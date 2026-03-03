import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userBases } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json() as unknown
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const [base] = await db
    .update(userBases)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(userBases.id, id))
    .returning()

  if (!base) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(base)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(userBases).where(eq(userBases.id, id))
  return NextResponse.json({ success: true })
}
