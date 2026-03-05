import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSession } from '@/lib/auth'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = neon(process.env.DATABASE_URL!)

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS user_bases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        workspace TEXT NOT NULL DEFAULT 'personal',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS user_tables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        base_id UUID NOT NULL REFERENCES user_bases(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS user_columns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id UUID NOT NULL REFERENCES user_tables(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        column_type TEXT NOT NULL DEFAULT 'text',
        options JSONB,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS user_rows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id UUID NOT NULL REFERENCES user_tables(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS user_bases_workspace_idx ON user_bases(workspace)`
    await sql`CREATE INDEX IF NOT EXISTS user_tables_base_idx ON user_tables(base_id)`
    await sql`CREATE INDEX IF NOT EXISTS user_columns_table_idx ON user_columns(table_id)`
    await sql`CREATE INDEX IF NOT EXISTS user_rows_table_idx ON user_rows(table_id)`

    return NextResponse.json({ ok: true, message: 'Tables created successfully' })
  } catch (err) {
    console.error('Migration error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
