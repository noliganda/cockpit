import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT id, content, generated_at, workspace_id, generated_by
    FROM briefs
    ORDER BY generated_at DESC
    LIMIT 1
  `
  if (rows.length === 0) return NextResponse.json({ brief: null })
  return NextResponse.json({ brief: rows[0] })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, workspace_id, generated_by } = await req.json()
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const rows = await sql`
    INSERT INTO briefs (content, workspace_id, generated_by)
    VALUES (${content}, ${workspace_id ?? null}, ${generated_by ?? 'charlie'})
    RETURNING id, content, generated_at, workspace_id, generated_by
  `
  return NextResponse.json({ brief: rows[0] }, { status: 201 })
}
