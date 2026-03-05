import { NextRequest, NextResponse } from 'next/server'
import { search } from '@/lib/search'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  query: z.string().min(1),
  workspaceId: z.string().optional(),
  limit: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as unknown
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const results = await search(parsed.data.query, parsed.data.workspaceId, parsed.data.limit)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('[POST /api/search]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
