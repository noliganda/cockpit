/**
 * Intake Pipeline — OPS v5
 *
 * Shared processing logic for all intake sources (manual, Slack, email, etc.)
 * Accepts a validated IntakePayload, classifies, creates objects, logs events.
 *
 * This module is the single intake execution path — routes are thin wrappers.
 */

import { db } from './db'
import { tasks, projects, taskEvents } from './db/schema'
import { logActivity } from './activity'
import { classifyIntake } from './intake'
import { validateParent, inheritFromParent } from './task-hierarchy'
import type { IntakePayload, IntakeResult, IntakeEventType } from '@/types'

interface Actor {
  actorType: 'human' | 'agent' | 'system'
  actorId: string
  actorName: string
}

/**
 * Run the full intake pipeline: classify → create → log
 */
export async function processIntake(
  payload: IntakePayload,
  actor: Actor,
): Promise<IntakeResult> {
  // ── Step 1: Classify ──────────────────────────────────────────────────
  const classification = await classifyIntake(payload)

  // ── Log intake_received ───────────────────────────────────────────────
  await logActivity({
    workspaceId: classification.workspaceId,
    actor: actor.actorName,
    action: 'intake_received',
    entityType: 'intake',
    description: `Intake received: "${classification.title}" classified as ${classification.objectType} (${classification.confidence} confidence)`,
    metadata: {
      sourceType: payload.sourceType,
      sourceChannel: payload.sourceChannel,
      objectType: classification.objectType,
      confidence: classification.confidence,
      isDraft: classification.isDraft,
      rawTextLength: payload.rawText.length,
    },
    actorType: actor.actorType,
    actorId: actor.actorId,
    actorName: actor.actorName,
    eventFamily: 'intake',
    eventType: 'intake_received',
    sourceSystem: payload.sourceType === 'slack' ? 'slack' : 'dashboard',
    status: 'success',
  })

  // ── Step 2: Route to creation handler ─────────────────────────────────
  let result: IntakeResult

  switch (classification.objectType) {
    case 'task':
    case 'document_request':
    case 'communication_action':
    case 'research_request':
      result = await createTaskFromIntake(payload, classification, actor)
      break

    case 'project':
      result = await createProjectFromIntake(payload, classification, actor)
      break

    case 'event':
      result = await createTaskFromIntake(payload, { ...classification, objectType: 'event' }, actor)
      break

    default:
      result = await createTaskFromIntake(payload, classification, actor)
  }

  // ── Determine if review is needed ───────────────────────────────────
  const needsReview = classification.isDraft
    || classification.confidence === 'low'
    || classification.confidence === 'medium'

  // ── Log intake_classified ─────────────────────────────────────────────
  await logActivity({
    workspaceId: classification.workspaceId,
    actor: actor.actorName,
    action: 'intake_classified',
    entityType: classification.objectType,
    entityId: result.objectId,
    entityTitle: result.title,
    description: `Intake routed: created ${classification.objectType}${classification.isDraft ? ' (draft)' : ''} "${result.title}"`,
    metadata: {
      objectType: classification.objectType,
      confidence: classification.confidence,
      isDraft: classification.isDraft,
      sourceType: payload.sourceType,
      parentTaskId: result.parentTaskId,
      sourceChannel: payload.sourceChannel,
      sourceUrl: payload.sourceUrl,
      needsReview,
    },
    actorType: actor.actorType,
    actorId: actor.actorId,
    actorName: actor.actorName,
    eventFamily: 'intake',
    eventType: needsReview ? 'intake_needs_review' : 'intake_classified',
    sourceSystem: payload.sourceType === 'slack' ? 'slack' : 'dashboard',
    status: 'success',
    requiresApproval: needsReview,
    approvalStatus: needsReview ? 'pending' : 'not_required',
  })

  return result
}

// ── Task creation from intake ────────────────────────────────────────────────

async function createTaskFromIntake(
  payload: IntakePayload,
  classification: ReturnType<typeof classifyIntake>,
  actor: Actor,
): Promise<IntakeResult> {
  const isSubtask = !!payload.parentTaskId
  let parentTask: Awaited<ReturnType<typeof validateParent>>['parent'] = null

  if (isSubtask) {
    const validation = await validateParent(payload.parentTaskId!)
    if (validation.valid) {
      parentTask = validation.parent
    }
    // Invalid parent → fall back to top-level (intake is resilient)
  }

  const inherited = isSubtask && parentTask ? inheritFromParent(parentTask) : {}
  const now = new Date()

  const insertData = {
    ...inherited,
    workspaceId: classification.workspaceId,
    title: classification.title,
    description: classification.description,
    status: 'Backlog',
    priority: payload.priority ?? 'medium',
    objectType: classification.objectType,
    sourceType: payload.sourceType,
    sourceChannel: payload.sourceChannel,
    sourceMessageId: payload.sourceMessageId,
    sourceUrl: payload.sourceUrl,
    sourceCreatedAt: payload.sourceCreatedAt ? new Date(payload.sourceCreatedAt) : undefined,
    lastActivityAt: now,
    parentTaskId: parentTask ? payload.parentTaskId : undefined,
    assigneeId: payload.assigneeId,
    assigneeName: payload.assigneeName,
    assignee: payload.assigneeName,
  } as typeof tasks.$inferInsert

  const [task] = await db.insert(tasks).values(insertData).returning()

  const isActualSubtask = !!task.parentTaskId
  const eventType: IntakeEventType = isActualSubtask ? 'intake_subtask_created' : 'intake_task_created'

  await db.insert(taskEvents).values({
    taskId: task.id,
    eventType,
    toStatus: task.status,
    actorType: actor.actorType,
    actorId: actor.actorId,
    actorName: actor.actorName,
    summaryNote: `Created via intake from ${payload.sourceType}`,
    metadata: {
      sourceType: payload.sourceType,
      sourceChannel: payload.sourceChannel,
      confidence: classification.confidence,
      objectType: classification.objectType,
      parentTaskId: task.parentTaskId,
    },
  })

  await logActivity({
    workspaceId: task.workspaceId,
    actor: actor.actorName,
    action: 'created',
    entityType: 'task',
    entityId: task.id,
    entityTitle: task.title,
    description: `${actor.actorName} created ${isActualSubtask ? 'subtask' : 'task'} "${task.title}" via ${payload.sourceType} intake`,
    metadata: {
      sourceType: payload.sourceType,
      sourceChannel: payload.sourceChannel,
      objectType: classification.objectType,
      confidence: classification.confidence,
      parentTaskId: task.parentTaskId,
    },
    actorType: actor.actorType,
    actorId: actor.actorId,
    actorName: actor.actorName,
    eventFamily: 'task',
    eventType,
    sourceSystem: payload.sourceType === 'slack' ? 'slack' : 'dashboard',
    status: 'success',
  })

  return {
    success: true,
    objectType: classification.objectType,
    objectId: task.id,
    title: task.title,
    confidence: classification.confidence,
    isDraft: classification.isDraft,
    parentTaskId: task.parentTaskId,
    workspaceId: task.workspaceId,
    intakeEventType: eventType,
  }
}

// ── Project creation from intake ─────────────────────────────────────────────

async function createProjectFromIntake(
  payload: IntakePayload,
  classification: ReturnType<typeof classifyIntake>,
  actor: Actor,
): Promise<IntakeResult> {
  const [project] = await db.insert(projects).values({
    workspaceId: classification.workspaceId,
    name: classification.title,
    description: classification.description,
    status: 'Planning',
  }).returning()

  const eventType: IntakeEventType = 'intake_project_created'

  await logActivity({
    workspaceId: project.workspaceId,
    actor: actor.actorName,
    action: 'created',
    entityType: 'project',
    entityId: project.id,
    entityTitle: project.name,
    description: `${actor.actorName} created project "${project.name}" via ${payload.sourceType} intake`,
    metadata: {
      sourceType: payload.sourceType,
      sourceChannel: payload.sourceChannel,
      objectType: 'project',
      confidence: classification.confidence,
    },
    actorType: actor.actorType,
    actorId: actor.actorId,
    actorName: actor.actorName,
    eventFamily: 'intake',
    eventType,
    sourceSystem: payload.sourceType === 'slack' ? 'slack' : 'dashboard',
    status: 'success',
  })

  return {
    success: true,
    objectType: 'project',
    objectId: project.id,
    title: project.name,
    confidence: classification.confidence,
    isDraft: classification.isDraft,
    workspaceId: project.workspaceId,
    intakeEventType: eventType,
  }
}
