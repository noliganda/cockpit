import { db } from './db'
import { tasks, projects, notes, contacts } from './db/schema'
import { sql, ilike, or } from 'drizzle-orm'
import { generateEmbedding } from './embeddings'

export interface SearchResult {
  id: string
  type: 'task' | 'project' | 'note' | 'contact' | 'activity'
  title: string
  description?: string | null
  workspaceId: string
  score?: number
}

export async function search(
  query: string,
  workspaceId?: string,
  limit = 20
): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  // Layer 1: Full-text SQL search across entities
  const taskResults = await db
    .select({ id: tasks.id, title: tasks.title, description: tasks.description, workspaceId: tasks.workspaceId })
    .from(tasks)
    .where(
      workspaceId
        ? sql`${tasks.workspaceId} = ${workspaceId} AND (${tasks.title} ILIKE ${`%${query}%`} OR ${tasks.description} ILIKE ${`%${query}%`})`
        : or(ilike(tasks.title, `%${query}%`), ilike(tasks.description ?? sql`''`, `%${query}%`))
    )
    .limit(10)

  taskResults.forEach(t => results.push({ ...t, type: 'task' as const, description: t.description }))

  const projectResults = await db
    .select({ id: projects.id, title: projects.name, description: projects.description, workspaceId: projects.workspaceId })
    .from(projects)
    .where(
      workspaceId
        ? sql`${projects.workspaceId} = ${workspaceId} AND ${projects.name} ILIKE ${`%${query}%`}`
        : ilike(projects.name, `%${query}%`)
    )
    .limit(5)

  projectResults.forEach(p => results.push({ ...p, type: 'project' as const }))

  const noteResults = await db
    .select({ id: notes.id, title: notes.title, contentPlaintext: notes.contentPlaintext, workspaceId: notes.workspaceId })
    .from(notes)
    .where(
      workspaceId
        ? sql`${notes.workspaceId} = ${workspaceId} AND ${notes.title} ILIKE ${`%${query}%`}`
        : ilike(notes.title, `%${query}%`)
    )
    .limit(5)

  noteResults.forEach(n => results.push({ id: n.id, title: n.title, description: n.contentPlaintext, workspaceId: n.workspaceId, type: 'note' as const }))

  const contactResults = await db
    .select({ id: contacts.id, title: contacts.name, notes: contacts.notes, workspaceId: contacts.workspaceId })
    .from(contacts)
    .where(
      workspaceId
        ? sql`${contacts.workspaceId} = ${workspaceId} AND ${contacts.name} ILIKE ${`%${query}%`}`
        : ilike(contacts.name, `%${query}%`)
    )
    .limit(5)

  contactResults.forEach(c => results.push({ id: c.id, title: c.title, description: c.notes, workspaceId: c.workspaceId, type: 'contact' as const }))

  // Layer 2: Semantic search on activity_log if OpenAI is available
  if (process.env.OPENAI_API_KEY) {
    try {
      const embedding = await generateEmbedding(query)
      const vectorStr = `[${embedding.join(',')}]`
      const semanticResults = await db.execute(
        sql`SELECT id, entity_type as type, entity_title as title, description, workspace_id as "workspaceId",
            1 - (embedding <=> ${vectorStr}::vector) as score
            FROM activity_log
            WHERE embedding IS NOT NULL
            ${workspaceId ? sql`AND workspace_id = ${workspaceId}` : sql``}
            ORDER BY embedding <=> ${vectorStr}::vector
            LIMIT ${limit}`
      ) as { rows: Array<{ id: string; type: string; title: string; description: string; workspaceId: string; score: number }> }

      semanticResults.rows.forEach(r => {
        if (!results.find(existing => existing.id === r.id)) {
          results.push({
            id: r.id,
            type: 'activity' as const,
            title: r.title ?? r.description ?? 'Activity',
            description: r.description,
            workspaceId: r.workspaceId,
            score: r.score,
          })
        }
      })
    } catch {
      // Semantic search unavailable — degrade gracefully
    }
  }

  return results.slice(0, limit)
}
