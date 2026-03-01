import { Client } from '@notionhq/client'
import { db } from './db'
import { tasks } from './db/schema'
import { eq, and } from 'drizzle-orm'
import { logActivity } from './activity'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

const DB_WORKSPACE_MAP: Record<string, string> = {
  [process.env.NOTION_KORUS_TASKS_DB ?? '']: 'korus',
  [process.env.NOTION_BF_TASKS_DB ?? '']: 'byron-film',
  [process.env.NOTION_OC_TASKS_DB ?? '']: 'personal',
}

interface SyncResult {
  workspaceId: string
  created: number
  updated: number
  skipped: number
  errors: string[]
}

interface NotionPage {
  id: string
  object: string
  properties: Record<string, unknown>
  parent?: { type?: string; database_id?: string }
}

function extractTitle(properties: Record<string, unknown>): string {
  for (const key of ['Name', 'Title', 'Task', 'name', 'title']) {
    const prop = properties[key] as { title?: Array<{ plain_text: string }> } | undefined
    const text = prop?.title?.map(t => t.plain_text).join('') ?? ''
    if (text) return text
  }
  // Try any title-type property
  for (const [, value] of Object.entries(properties)) {
    const prop = value as { type?: string; title?: Array<{ plain_text: string }> }
    if (prop?.type === 'title') {
      const text = prop.title?.map(t => t.plain_text).join('') ?? ''
      if (text) return text
    }
  }
  return 'Untitled'
}

function extractStatus(properties: Record<string, unknown>): string {
  for (const key of ['Status', 'status', 'Stage', 'stage', 'State']) {
    const prop = properties[key] as { status?: { name: string }; select?: { name: string } } | undefined
    if (prop?.status?.name) return prop.status.name
    if (prop?.select?.name) return prop.select.name
  }
  return 'Backlog'
}

function extractDate(properties: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const prop = properties[key] as { date?: { start: string } } | undefined
    if (prop?.date?.start) return prop.date.start
  }
  return null
}

export async function syncNotionDatabase(databaseId: string): Promise<SyncResult> {
  const workspaceId = DB_WORKSPACE_MAP[databaseId]
  if (!workspaceId) throw new Error(`Unknown database ID: ${databaseId}`)

  const result: SyncResult = { workspaceId, created: 0, updated: 0, skipped: 0, errors: [] }

  let hasMore = true
  let cursor: string | undefined

  while (hasMore) {
    // v5 Notion uses search to query pages in a database
    const response = await notion.search({
      filter: { property: 'object', value: 'page' },
      start_cursor: cursor,
      page_size: 100,
    })

    const pages = response.results
      .map(page => page as unknown as NotionPage)
      .filter(page => {
        if (page.object !== 'page') return false
        return page.parent?.type === 'database_id' && page.parent?.database_id === databaseId
      })

    for (const page of pages) {
      try {
        const props = page.properties
        const title = extractTitle(props)
        const status = extractStatus(props)
        const dueDate = extractDate(props, ['Due Date', 'Due', 'Date', 'Deadline'])

        const [existing] = await db
          .select({ id: tasks.id, title: tasks.title, status: tasks.status })
          .from(tasks)
          .where(and(eq(tasks.notionId, page.id), eq(tasks.workspaceId, workspaceId)))
          .limit(1)

        if (existing) {
          if (existing.title !== title || existing.status !== status) {
            await db
              .update(tasks)
              .set({ title, status, dueDate, notionLastSynced: new Date(), updatedAt: new Date() })
              .where(eq(tasks.id, existing.id))
            result.updated++
          } else {
            result.skipped++
          }
        } else {
          await db.insert(tasks).values({
            workspaceId,
            title,
            status,
            dueDate,
            notionId: page.id,
            notionLastSynced: new Date(),
          })
          result.created++
        }
      } catch (err) {
        result.errors.push(String(err))
      }
    }

    hasMore = response.has_more && pages.length > 0
    cursor = response.next_cursor ?? undefined

    // If no matching pages in this batch but more results, continue
    if (response.results.length === 0) {
      hasMore = false
    }
  }

  if (result.created > 0 || result.updated > 0) {
    await logActivity({
      workspaceId,
      actor: 'system',
      action: 'sync',
      entityType: 'notion',
      description: `Synced ${result.created} created, ${result.updated} updated from Notion`,
    })
  }

  return result
}

export async function syncAllNotionDatabases(): Promise<SyncResult[]> {
  const dbIds = [
    process.env.NOTION_KORUS_TASKS_DB,
    process.env.NOTION_BF_TASKS_DB,
    process.env.NOTION_OC_TASKS_DB,
  ].filter(Boolean) as string[]

  const results: SyncResult[] = []
  for (const dbId of dbIds) {
    try {
      results.push(await syncNotionDatabase(dbId))
    } catch (err) {
      results.push({ workspaceId: DB_WORKSPACE_MAP[dbId] ?? 'unknown', created: 0, updated: 0, skipped: 0, errors: [String(err)] })
    }
  }
  return results
}
