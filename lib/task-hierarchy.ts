/**
 * Task Hierarchy Helper — OPS v5
 *
 * Handles:
 * - Parent/subtask validation
 * - Rollup computation from child states to parent
 * - Hierarchy-aware event emission
 *
 * Product rules (v1):
 * - Two-level hierarchy only: parent task + subtask
 * - Parent = strategic prioritisation object
 * - Subtask = execution object
 * - Subtasks inherit parent context by default
 * - Child state influences parent visibility via rollups
 */

import { db } from './db'
import { tasks, taskEvents } from './db/schema'
import { eq, sql } from 'drizzle-orm'
import { logActivity } from './activity'
import { toNormalized } from './task-lifecycle'

// ── Types ────────────────────────────────────────────────────────────────────

export interface RollupResult {
  totalChildren: number
  completedChildren: number
  blockedChildren: number
  inProgressChildren: number
  /** True if all children are done/cancelled */
  allChildrenResolved: boolean
  /** True if any child is blocked */
  hasBlockedChild: boolean
  /** True if any child is overdue */
  hasOverdueChild: boolean
  /** Suggested parent signal */
  parentSignal: 'on_track' | 'at_risk' | 'blocked' | 'ready_for_review' | 'all_done'
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate that a parent task exists and is a valid parent.
 * Returns the parent task or null.
 */
export async function validateParent(parentTaskId: string) {
  const [parent] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, parentTaskId))
    .limit(1)

  if (!parent) return { valid: false, error: 'Parent task not found', parent: null } as const

  // v1 rule: no nesting beyond 2 levels
  if (parent.parentTaskId) {
    return { valid: false, error: 'Cannot create subtask under another subtask (max 2 levels)', parent: null } as const
  }

  return { valid: true, error: null, parent } as const
}

/**
 * Check that moving a task to become a child doesn't create a cycle
 * (in v1 two-level model this is simpler — just check the parent isn't itself a child)
 */
export async function validateReparent(taskId: string, newParentId: string): Promise<{ valid: boolean; error: string | null }> {
  // Can't be your own parent
  if (taskId === newParentId) return { valid: false, error: 'Task cannot be its own parent' }

  // Check new parent isn't a subtask
  const [newParent] = await db.select().from(tasks).where(eq(tasks.id, newParentId)).limit(1)
  if (!newParent) return { valid: false, error: 'Parent task not found' }
  if (newParent.parentTaskId) return { valid: false, error: 'Cannot nest under a subtask (max 2 levels)' }

  // Check the task being moved doesn't have children (can't nest a parent under another parent)
  const children = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.parentTaskId, taskId))
    .limit(1)
  if (children.length > 0) return { valid: false, error: 'Cannot move a parent task with children under another parent' }

  return { valid: true, error: null }
}

// ── Rollup computation ───────────────────────────────────────────────────────

/**
 * Compute rollup state for a parent task from its children.
 */
export async function computeRollup(parentTaskId: string): Promise<RollupResult> {
  const children = await db
    .select({
      id: tasks.id,
      status: tasks.status,
      dueDate: tasks.dueDate,
      blockedReason: tasks.blockedReason,
    })
    .from(tasks)
    .where(eq(tasks.parentTaskId, parentTaskId))

  const total = children.length

  if (total === 0) {
    return {
      totalChildren: 0,
      completedChildren: 0,
      blockedChildren: 0,
      inProgressChildren: 0,
      allChildrenResolved: true,
      hasBlockedChild: false,
      hasOverdueChild: false,
      parentSignal: 'on_track',
    }
  }

  let completed = 0
  let blocked = 0
  let inProgress = 0
  let hasOverdue = false
  const today = new Date().toISOString().split('T')[0]

  for (const child of children) {
    const norm = toNormalized(child.status)
    if (norm === 'done' || norm === 'cancelled') completed++
    else if (norm === 'blocked') blocked++
    else if (norm === 'in_progress') inProgress++

    if (child.dueDate && child.dueDate < today && norm !== 'done' && norm !== 'cancelled') {
      hasOverdue = true
    }
  }

  const allResolved = completed === total
  const hasBlockedChild = blocked > 0

  let parentSignal: RollupResult['parentSignal'] = 'on_track'
  if (allResolved) {
    parentSignal = 'all_done'
  } else if (hasBlockedChild) {
    parentSignal = 'blocked'
  } else if (hasOverdue) {
    parentSignal = 'at_risk'
  } else if (completed > 0 && completed === total - 1) {
    // All but one done — nearly there
    parentSignal = 'ready_for_review'
  }

  return {
    totalChildren: total,
    completedChildren: completed,
    blockedChildren: blocked,
    inProgressChildren: inProgress,
    allChildrenResolved: allResolved,
    hasBlockedChild,
    hasOverdueChild: hasOverdue,
    parentSignal,
  }
}

// ── Rollup application ──────────────────────────────────────────────────────

/**
 * After a child task state change, compute rollup and emit relevant events on the parent.
 * Does NOT auto-transition parent status (that's a product decision for later).
 * Does emit events and update parent lastActivityAt.
 */
export async function applyParentRollup(
  parentTaskId: string,
  triggerChildId: string,
): Promise<RollupResult> {
  const rollup = await computeRollup(parentTaskId)

  const [parent] = await db
    .select({ id: tasks.id, title: tasks.title, workspaceId: tasks.workspaceId, status: tasks.status })
    .from(tasks)
    .where(eq(tasks.id, parentTaskId))
    .limit(1)

  if (!parent) return rollup

  // Update parent lastActivityAt
  await db
    .update(tasks)
    .set({ lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(tasks.id, parentTaskId))

  // ── Emit rollup event ──────────────────────────────────────────────────
  await db.insert(taskEvents).values({
    taskId: parentTaskId,
    eventType: 'task_rollup_updated',
    actorType: 'system',
    actorId: 'system',
    actorName: 'System',
    summaryNote: `${rollup.completedChildren}/${rollup.totalChildren} subtasks complete` +
      (rollup.blockedChildren > 0 ? `, ${rollup.blockedChildren} blocked` : ''),
    metadata: {
      triggerChildId,
      ...rollup,
    },
  })

  await logActivity({
    workspaceId: parent.workspaceId,
    actor: 'system',
    action: 'rollup_updated',
    entityType: 'task',
    entityId: parent.id,
    entityTitle: parent.title,
    description: `Rollup updated for "${parent.title}": ${rollup.completedChildren}/${rollup.totalChildren} subtasks complete`,
    metadata: { triggerChildId, ...rollup },
    actorType: 'system',
    actorId: 'system',
    actorName: 'System',
    eventFamily: 'task',
    eventType: 'task_rollup_updated',
    sourceSystem: 'dashboard',
    status: 'success',
  })

  // ── Emit signal events when thresholds are crossed ─────────────────────
  if (rollup.parentSignal === 'blocked' || rollup.parentSignal === 'at_risk') {
    const eventType = rollup.parentSignal === 'blocked' ? 'parent_at_risk' : 'parent_at_risk'
    const desc = rollup.parentSignal === 'blocked'
      ? `"${parent.title}" has ${rollup.blockedChildren} blocked subtask(s)`
      : `"${parent.title}" has overdue subtask(s)`

    await db.insert(taskEvents).values({
      taskId: parentTaskId,
      eventType,
      actorType: 'system',
      actorId: 'system',
      actorName: 'System',
      summaryNote: desc,
      metadata: { signal: rollup.parentSignal, triggerChildId },
    })

    await logActivity({
      workspaceId: parent.workspaceId,
      actor: 'system',
      action: 'at_risk',
      entityType: 'task',
      entityId: parent.id,
      entityTitle: parent.title,
      description: desc,
      actorType: 'system',
      eventFamily: 'task',
      eventType: 'parent_at_risk',
      sourceSystem: 'dashboard',
      status: 'success',
    })
  }

  if (rollup.parentSignal === 'all_done') {
    await db.insert(taskEvents).values({
      taskId: parentTaskId,
      eventType: 'parent_ready_for_review',
      actorType: 'system',
      actorId: 'system',
      actorName: 'System',
      summaryNote: `All ${rollup.totalChildren} subtasks complete — parent ready for review`,
      metadata: { signal: 'all_done', triggerChildId },
    })

    await logActivity({
      workspaceId: parent.workspaceId,
      actor: 'system',
      action: 'ready_for_review',
      entityType: 'task',
      entityId: parent.id,
      entityTitle: parent.title,
      description: `All ${rollup.totalChildren} subtasks complete for "${parent.title}" — ready for review`,
      actorType: 'system',
      eventFamily: 'task',
      eventType: 'parent_ready_for_review',
      sourceSystem: 'dashboard',
      status: 'success',
    })
  }

  return rollup
}

// ── Subtask context inheritance ──────────────────────────────────────────────

/**
 * Fields a subtask should inherit from its parent when not explicitly set.
 */
export function inheritFromParent(parent: {
  workspaceId: string
  projectId: string | null
  areaId: string | null
  priority: string | null
  tags: string[] | null
}) {
  return {
    workspaceId: parent.workspaceId,
    projectId: parent.projectId,
    areaId: parent.areaId,
    priority: parent.priority,
    tags: parent.tags,
  }
}

// ── Query helpers ────────────────────────────────────────────────────────────

/**
 * Get child count for a task (useful for checking if a task is a parent).
 */
export async function getChildCount(taskId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(eq(tasks.parentTaskId, taskId))
  return result[0]?.count ?? 0
}
