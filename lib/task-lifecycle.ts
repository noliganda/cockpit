/**
 * Task Lifecycle Helper — OPS v5
 *
 * Handles:
 * - Status transition validation
 * - Mapping between legacy UI labels and normalized lifecycle
 * - Automatic timestamp inference
 * - Event type inference from status transitions
 */

import type { TaskEventType } from '@/types'

// ── Legacy UI statuses (what the current UI uses) ────────────────────────────

export const LEGACY_STATUSES = ['Backlog', 'To Do', 'In Progress', 'Needs Review', 'Done', 'Cancelled'] as const
export type LegacyStatus = typeof LEGACY_STATUSES[number]

// ── Normalized internal lifecycle statuses ───────────────────────────────────

export const NORMALIZED_STATUSES = ['draft', 'queued', 'in_progress', 'blocked', 'awaiting_review', 'done', 'cancelled'] as const
export type NormalizedStatus = typeof NORMALIZED_STATUSES[number]

// ── Bidirectional mapping ────────────────────────────────────────────────────

const legacyToNormalized: Record<string, NormalizedStatus> = {
  'Backlog': 'queued',
  'To Do': 'queued',
  'In Progress': 'in_progress',
  'Needs Review': 'awaiting_review',
  'Done': 'done',
  'Cancelled': 'cancelled',
  // Also accept normalized statuses directly
  'draft': 'draft',
  'queued': 'queued',
  'in_progress': 'in_progress',
  'blocked': 'blocked',
  'awaiting_review': 'awaiting_review',
  'done': 'done',
  'cancelled': 'cancelled',
}

export function toNormalized(status: string): NormalizedStatus {
  return legacyToNormalized[status] ?? 'queued'
}

// ── Allowed transitions (normalized) ─────────────────────────────────────────

const allowedTransitions: Record<NormalizedStatus, NormalizedStatus[]> = {
  draft: ['queued', 'cancelled'],
  queued: ['in_progress', 'cancelled', 'draft'],
  in_progress: ['blocked', 'awaiting_review', 'done', 'cancelled', 'queued'],
  blocked: ['in_progress', 'cancelled', 'queued'],
  awaiting_review: ['done', 'in_progress', 'queued'],
  done: ['in_progress', 'queued'], // reopen
  cancelled: ['queued', 'draft'], // resurrect
}

export function isValidTransition(fromStatus: string, toStatus: string): boolean {
  const fromNorm = toNormalized(fromStatus)
  const toNorm = toNormalized(toStatus)
  if (fromNorm === toNorm) return true // no-op is always valid
  return allowedTransitions[fromNorm]?.includes(toNorm) ?? false
}

// ── Event type inference from status transition ──────────────────────────────

export function inferEventType(fromStatus: string, toStatus: string): TaskEventType {
  const from = toNormalized(fromStatus)
  const to = toNormalized(toStatus)

  if (from === to) return 'task_updated'

  switch (to) {
    case 'in_progress':
      if (from === 'blocked') return 'task_unblocked'
      if (from === 'done' || from === 'awaiting_review') return 'task_reopened'
      return 'task_started'
    case 'blocked':
      return 'task_blocked'
    case 'awaiting_review':
      return 'task_submitted_for_review'
    case 'done':
      if (from === 'awaiting_review') return 'task_approved'
      return 'task_completed'
    case 'cancelled':
      return 'task_cancelled'
    case 'queued':
      if (from === 'done' || from === 'cancelled') return 'task_reopened'
      return 'task_updated'
    case 'draft':
      return 'task_updated'
    default:
      return 'task_updated'
  }
}

// ── Timestamp side-effects ───────────────────────────────────────────────────

export interface TimestampUpdates {
  startedAt?: Date
  completedAt?: Date | null
  lastActivityAt: Date
}

export function inferTimestamps(
  fromStatus: string,
  toStatus: string,
  currentStartedAt: Date | null | undefined,
): TimestampUpdates {
  const to = toNormalized(toStatus)
  const now = new Date()
  const updates: TimestampUpdates = { lastActivityAt: now }

  // Set startedAt on first move into active work
  if (to === 'in_progress' && !currentStartedAt) {
    updates.startedAt = now
  }

  // Set completedAt on done
  if (to === 'done') {
    updates.completedAt = now
  }

  // Clear completedAt if reopened
  if (to === 'in_progress' || to === 'queued' || to === 'blocked') {
    updates.completedAt = null
  }

  return updates
}

// ── Activity log event description builder ───────────────────────────────────

export function buildEventDescription(
  eventType: TaskEventType,
  opts: {
    taskTitle: string
    actorName?: string
    blockedReason?: string
    summaryNote?: string
    assigneeName?: string
  },
): string {
  const actor = opts.actorName ?? 'System'

  switch (eventType) {
    case 'task_created':
      return `${actor} created task: ${opts.taskTitle}`
    case 'task_assigned':
      return `${actor} assigned task "${opts.taskTitle}" to ${opts.assigneeName ?? 'unknown'}`
    case 'task_started':
      return `${actor} started work on "${opts.taskTitle}"`
    case 'task_blocked':
      return `${actor} marked "${opts.taskTitle}" as blocked${opts.blockedReason ? `: ${opts.blockedReason}` : ''}`
    case 'task_unblocked':
      return `${actor} unblocked "${opts.taskTitle}"`
    case 'task_submitted_for_review':
      return `${actor} submitted "${opts.taskTitle}" for review`
    case 'task_approved':
      return `${actor} approved "${opts.taskTitle}"`
    case 'task_reopened':
      return `${actor} reopened "${opts.taskTitle}"`
    case 'task_completed':
      return `${actor} completed "${opts.taskTitle}"${opts.summaryNote ? ` — ${opts.summaryNote}` : ''}`
    case 'task_cancelled':
      return `${actor} cancelled "${opts.taskTitle}"`
    case 'task_updated':
      return `${actor} updated "${opts.taskTitle}"${opts.summaryNote ? ` — ${opts.summaryNote}` : ''}`
    default:
      return `${actor} updated "${opts.taskTitle}"`
  }
}
