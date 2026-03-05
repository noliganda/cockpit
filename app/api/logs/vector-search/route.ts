import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateEmbedding } from '@/lib/embeddings'
import { sql } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { query, limit = 20 } = await request.json() as { query: string; limit?: number }

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Semantic search requires OPENAI_API_KEY — not configured.' }, { status: 422 })
    }

    const embedding = await generateEmbedding(query)
    const vectorStr = `[${embedding.join(',')}]`

    const results = await db.execute(sql`
      SELECT
        id,
        workspace_id as "workspaceId",
        actor,
        action,
        entity_type as "entityType",
        entity_id as "entityId",
        entity_title as "entityTitle",
        description,
        metadata,
        embedding_model as "hasEmbedding",
        created_at as "createdAt",
        1 - (embedding <=> ${sql.raw(`'${vectorStr}'::vector`)}) as score
      FROM activity_log
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${sql.raw(`'${vectorStr}'::vector`)}
      LIMIT ${limit}
    `)

    return NextResponse.json(results.rows)
  } catch (error) {
    console.error('[POST /api/logs/vector-search]', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
