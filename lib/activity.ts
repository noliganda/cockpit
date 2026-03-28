import { db } from './db'
import { activityLog } from './db/schema'
import { generateEmbeddingAsync } from './embeddings'

// ── Legacy interface — all existing callers continue to work ────────────────
interface LogActivityParams {
  workspaceId: string
  actor?: string
  action: string
  entityType: string
  entityId?: string
  entityTitle?: string
  description?: string
  metadata?: Record<string, unknown>
  entity?: string

  // ── OPS v5 canonical fields (all optional for backward compat) ────────
  actorType?: 'human' | 'agent' | 'system' | 'webhook'
  actorId?: string
  actorName?: string
  agentId?: string
  eventFamily?: string
  eventType?: string
  category?: string
  status?: 'success' | 'pending' | 'failed' | 'cancelled' | 'partial'
  sourceSystem?: string
  sourceUrl?: string
  workflowRunId?: string
  requiresApproval?: boolean
  approvalStatus?: 'not_required' | 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  durationMinutes?: number
  estimatedManualMinutes?: number
  humanIntervention?: boolean
  interventionType?: string
  apiCostUsd?: number
  apiTokensUsed?: number
  apiModel?: string
  artifactCount?: number
  artifactTypes?: string[]
}

export type { LogActivityParams }

export async function logActivity(params: LogActivityParams): Promise<void> {
  const text = [params.action, params.entityType, params.entityTitle, params.description]
    .filter(Boolean)
    .join(' ')

  try {
    const [entry] = await db
      .insert(activityLog)
      .values({
        // Legacy fields — always populated
        workspaceId: params.workspaceId,
        actor: params.actor ?? 'user',
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityTitle: params.entityTitle,
        description: params.description,
        metadata: params.metadata as Record<string, unknown>,
        entity: params.entity,

        // OPS v5 canonical fields — populated when provided
        ...(params.actorType !== undefined && { actorType: params.actorType }),
        ...(params.actorId !== undefined && { actorId: params.actorId }),
        ...(params.actorName !== undefined && { actorName: params.actorName }),
        ...(params.agentId !== undefined && { agentId: params.agentId }),
        ...(params.eventFamily !== undefined && { eventFamily: params.eventFamily }),
        ...(params.eventType !== undefined && { eventType: params.eventType }),
        ...(params.category !== undefined && { category: params.category }),
        ...(params.status !== undefined && { status: params.status }),
        ...(params.sourceSystem !== undefined && { sourceSystem: params.sourceSystem }),
        ...(params.sourceUrl !== undefined && { sourceUrl: params.sourceUrl }),
        ...(params.workflowRunId !== undefined && { workflowRunId: params.workflowRunId }),
        ...(params.requiresApproval !== undefined && { requiresApproval: params.requiresApproval }),
        ...(params.approvalStatus !== undefined && { approvalStatus: params.approvalStatus }),
        ...(params.approvedBy !== undefined && { approvedBy: params.approvedBy }),
        ...(params.durationMinutes !== undefined && { durationMinutes: params.durationMinutes }),
        ...(params.estimatedManualMinutes !== undefined && { estimatedManualMinutes: params.estimatedManualMinutes }),
        ...(params.humanIntervention !== undefined && { humanIntervention: params.humanIntervention }),
        ...(params.interventionType !== undefined && { interventionType: params.interventionType }),
        ...(params.apiCostUsd !== undefined && { apiCostUsd: params.apiCostUsd }),
        ...(params.apiTokensUsed !== undefined && { apiTokensUsed: params.apiTokensUsed }),
        ...(params.apiModel !== undefined && { apiModel: params.apiModel }),
        ...(params.artifactCount !== undefined && { artifactCount: params.artifactCount }),
        ...(params.artifactTypes !== undefined && { artifactTypes: params.artifactTypes }),
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
