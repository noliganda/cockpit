/**
 * Slack Thread → Parent/Subtask Inference — OPS v5
 *
 * Determines whether a Slack thread reply should become a subtask
 * under the parent task created from the root message.
 *
 * Rules:
 * 1. Thread reply (thread_ts != ts) → look up root message's task
 * 2. Root message (no thread_ts, or thread_ts == ts) → top-level task
 * 3. If root task found and is a valid parent → set parentTaskId
 * 4. If root task not found or invalid → fall back to top-level
 *
 * Object type constraints:
 * - task, document_request, communication_action, research_request → can be subtask
 * - project, event → should NOT become subtask (incompatible semantics)
 */

import { db } from './db'
import { tasks } from './db/schema'
import { eq, and } from 'drizzle-orm'
import type { IntakePayload, IntakeObjectType } from '@/types'

// Object types that can become subtasks under a thread parent
const SUBTASK_ELIGIBLE_TYPES: Set<IntakeObjectType> = new Set([
  'task',
  'document_request',
  'communication_action',
  'research_request',
])

export interface ThreadInferenceResult {
  /** Whether thread inference was attempted */
  attempted: boolean
  /** Whether a parent was found and the payload should become a subtask */
  inferred: boolean
  /** The parent task ID if inference succeeded */
  parentTaskId?: string
  /** The parent task title for logging */
  parentTitle?: string
  /** Reason for the decision */
  reason: string
}

/**
 * Detect whether a Slack message is a thread reply.
 * A message is a thread reply if thread_ts is present and differs from ts.
 */
export function isThreadReply(metadata?: Record<string, unknown>): { isReply: boolean; threadTs?: string } {
  const threadTs = metadata?.slackThreadTs as string | undefined
  if (!threadTs) return { isReply: false }

  // In Slack, the root message has thread_ts == ts.
  // A reply has thread_ts pointing to the root, with its own different ts.
  // We can't compare ts here (it's sourceMessageId on the payload), but
  // if slackThreadTs is present in metadata, the normalizer only sets it
  // when the event has a thread_ts field — so its presence is the signal.
  return { isReply: true, threadTs }
}

/**
 * Look up a Cockpit task created from a Slack root message.
 * Uses sourceType + sourceChannel + sourceMessageId for the lookup.
 */
async function findTaskFromSlackMessage(
  channelId: string,
  messageTs: string,
): Promise<{ id: string; title: string; parentTaskId: string | null } | null> {
  const [task] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      parentTaskId: tasks.parentTaskId,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.sourceType, 'slack'),
        eq(tasks.sourceChannel, channelId),
        eq(tasks.sourceMessageId, messageTs),
      ),
    )
    .limit(1)

  return task ?? null
}

/**
 * Run thread inference on an IntakePayload.
 *
 * If the payload represents a Slack thread reply and a parent task can be
 * found from the root message, returns the enriched payload with parentTaskId set.
 * Otherwise returns the payload unchanged.
 */
export async function inferThreadParent(
  payload: IntakePayload,
  classifiedObjectType?: IntakeObjectType,
): Promise<{ payload: IntakePayload; inference: ThreadInferenceResult }> {
  // Skip if parentTaskId is already explicitly set
  if (payload.parentTaskId) {
    return {
      payload,
      inference: {
        attempted: false,
        inferred: false,
        reason: 'parentTaskId already set explicitly',
      },
    }
  }

  // Skip if source is not Slack
  if (payload.sourceType !== 'slack') {
    return {
      payload,
      inference: {
        attempted: false,
        inferred: false,
        reason: 'Not a Slack source',
      },
    }
  }

  // Check if this is a thread reply
  const { isReply, threadTs } = isThreadReply(payload.metadata)
  if (!isReply || !threadTs) {
    return {
      payload,
      inference: {
        attempted: false,
        inferred: false,
        reason: 'Not a thread reply (root message or no thread_ts)',
      },
    }
  }

  // Check object type eligibility
  const effectiveType = classifiedObjectType ?? 'task'
  if (!SUBTASK_ELIGIBLE_TYPES.has(effectiveType)) {
    return {
      payload,
      inference: {
        attempted: true,
        inferred: false,
        reason: `Object type "${effectiveType}" is not eligible for subtask inference`,
      },
    }
  }

  // Look up the root message's task
  const channelId = payload.sourceChannel
  if (!channelId) {
    return {
      payload,
      inference: {
        attempted: true,
        inferred: false,
        reason: 'No source channel available for lookup',
      },
    }
  }

  const rootTask = await findTaskFromSlackMessage(channelId, threadTs)
  if (!rootTask) {
    return {
      payload,
      inference: {
        attempted: true,
        inferred: false,
        reason: `No Cockpit task found for root Slack message (channel=${channelId}, ts=${threadTs})`,
      },
    }
  }

  // Validate: root task must itself be a top-level task (not a subtask)
  if (rootTask.parentTaskId) {
    return {
      payload,
      inference: {
        attempted: true,
        inferred: false,
        reason: `Root message task "${rootTask.title}" is itself a subtask — cannot nest deeper`,
      },
    }
  }

  // Inference succeeds — enrich the payload
  const enrichedPayload: IntakePayload = {
    ...payload,
    parentTaskId: rootTask.id,
    metadata: {
      ...payload.metadata,
      threadInference: true,
      parentInferredFromThread: true,
      rootSlackMessageId: threadTs,
      inferredParentTitle: rootTask.title,
    },
  }

  return {
    payload: enrichedPayload,
    inference: {
      attempted: true,
      inferred: true,
      parentTaskId: rootTask.id,
      parentTitle: rootTask.title,
      reason: `Inferred parent "${rootTask.title}" from Slack thread root message`,
    },
  }
}
