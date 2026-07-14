import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const deleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as unknown
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const { ids } = parsed.data
    await db.delete(contacts).where(inArray(contacts.id, ids))

    return NextResponse.json({ success: true, count: ids.length })
  } catch (error) {
    console.error('[DELETE /api/contacts/batch]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
