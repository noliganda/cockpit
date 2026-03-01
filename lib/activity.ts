import { db } from './db'
import { activityLog } from './db/schema'
import { generateEmbeddingAsync } from './embeddings'

interface LogActivityParams {
  workspaceId: string
  actor?: string
  action: string
  entityType: string
  entityId?: string
  entityTitle?: string
  description?: string
  metadata?: Record<string, unknown>
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  const text = [params.action, params.entityType, params.entityTitle, params.description]
    .filter(Boolean)
    .join(' ')

  try {
    const [entry] = await db
      .insert(activityLog)
      .values({
        workspaceId: params.workspaceId,
        actor: params.actor ?? 'user',
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityTitle: params.entityTitle,
        description: params.description,
        metadata: params.metadata as Record<string, unknown>,
      })
      .returning()

    // Generate embedding asynchronously — never block the write
    if (entry?.id && process.env.OPENAI_API_KEY) {
      generateEmbeddingAsync(entry.id, text).catch(() => {
        // Silently fail — backfill cron will handle it
      })
    }
  } catch (err) {
    // Activity logging should never cause the main operation to fail
    console.error('Failed to log activity:', err)
  }
}
