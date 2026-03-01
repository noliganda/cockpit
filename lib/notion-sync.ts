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

interface DbSchema {
  titleProperty: string
  statusProperty: string | null
}

// Cache schema per database to avoid repeated API calls
const schemaCache = new Map<string, DbSchema>()

async function detectDatabaseSchema(databaseId: string): Promise<DbSchema> {
  if (schemaCache.has(databaseId)) return schemaCache.get(databaseId)!

  const dbInfo = await notion.databases.retrieve({ database_id: databaseId })
  let titleProperty = 'Name'
  let statusProperty: string | null = null

  // PartialDatabaseObjectResponse may not have properties — check first
  const properties = ('properties' in dbInfo && dbInfo.properties)
    ? (dbInfo.properties as Record<string, { type: string }>)
    : ({} as Record<string, { type: string }>)

  for (const [key, prop] of Object.entries(properties)) {
    if (prop.type === 'title') titleProperty = key
    if ((prop.type === 'status' || prop.type === 'select') && !statusProperty) {
      const lower = key.toLowerCase()
      if (['status', 'stage', 'state', 'progress'].includes(lower)) {
        statusProperty = key
      }
    }
  }

  // Fallback: any status/select property
  if (!statusProperty) {
    for (const [key, prop] of Object.entries(properties)) {
      if (prop.type === 'status' || prop.type === 'select') {
        statusProperty = key
        break
      }
    }
  }

  const schema: DbSchema = { titleProperty, statusProperty }
  schemaCache.set(databaseId, schema)
  return schema
}

function extractTitle(properties: Record<string, unknown>, titleKey: string): string {
  const prop = properties[titleKey] as { title?: Array<{ plain_text: string }> } | undefined
  const text = prop?.title?.map(t => t.plain_text).join('') ?? ''
  if (text) return text

  // Fallback: scan all title-type properties
  for (const [, value] of Object.entries(properties)) {
    const p = value as { type?: string; title?: Array<{ plain_text: string }> }
    if (p?.type === 'title') {
      const t = p.title?.map(item => item.plain_text).join('') ?? ''
      if (t) return t
    }
  }
  return 'Untitled'
}

function extractStatus(properties: Record<string, unknown>, statusKey: string | null): string {
  if (statusKey) {
    const prop = properties[statusKey] as { status?: { name: string }; select?: { name: string } } | undefined
    if (prop?.status?.name) return prop.status.name
    if (prop?.select?.name) return prop.select.name
  }

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

  // Auto-detect schema
  let schema: DbSchema
  try {
    schema = await detectDatabaseSchema(databaseId)
  } catch (err) {
    result.errors.push(`Schema detection failed: ${String(err)}`)
    schema = { titleProperty: 'Name', statusProperty: 'Status' }
  }

  let hasMore = true
  let cursor: string | undefined

  while (hasMore) {
    // v5 API: dataSources.query() with data_source_id
    const response = await notion.dataSources.query({
      data_source_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    })

    for (const page of response.results) {
      if (page.object !== 'page') continue

      try {
        const props = (page as { properties: Record<string, unknown> }).properties
        const title = extractTitle(props, schema.titleProperty)
        const status = extractStatus(props, schema.statusProperty)
        const dueDate = extractDate(props, ['Due Date', 'Due', 'Date', 'Deadline', 'due_date'])

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

    hasMore = response.has_more
    cursor = response.next_cursor ?? undefined
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
      results.push({
        workspaceId: DB_WORKSPACE_MAP[dbId] ?? 'unknown',
        created: 0, updated: 0, skipped: 0,
        errors: [String(err)],
      })
    }
  }
  return results
}
