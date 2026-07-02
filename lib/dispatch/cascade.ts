/**
 * Dependency cascade.
 *
 * Phase 1 of the dispatch engine (see
 * docs/current/architecture/COCKPIT-DISPATCH-ENGINE-SPEC.md §5.4).
 *
 * When a task transitions to Done, `cascadeOnCompletion` finds every task that
 * depends on it, re-evaluates each dependent's readiness, and — for those now
 * fully ready — enqueues an `agent_wakeup_request` (source `dependency_cascade`).
 * Nothing claims those requests in Phase 1; the dispatcher arrives in Phase 2.
 *
 * This never throws: a cascade failure must not break the task mutation that
 * triggered it (same contract as logActivity).
 */
import { db } from '@/lib/db'
import { tasks, taskDependencies, taskEvents } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { toNormalized } from '@/lib/task-lifecycle'
import { evaluateReadiness } from './readiness'
import { createWakeupRequest } from '@/lib/agent-execution'
import { logActivity } from '@/lib/activity'

export interface CascadeResult {
  /** Dependents whose edge on the completed task is now satisfied. */
  unblocked: number
  /** Dependents that became fully ready and were enqueued for dispatch. */
  promoted: number
  /** Dependents still waiting on other prerequisites / readiness checks. */
  stillBlocked: number
}

/** Mirror of readiness.isPrerequisiteSatisfied, kept local to avoid coupling. */
function edgeSatisfied(
  type: string,
  prereq: { status: string; artifactUrl: string | null },
): boolean {
  const normalized = toNormalized(prereq.status)
  switch (type) {
    case 'needs_review':
      return normalized === 'awaiting_review' || normalized === 'done'
    case 'needs_artifact':
      return normalized === 'done' && !!prereq.artifactUrl
    case 'blocks':
    default:
      return normalized === 'done'
  }
}

export async function cascadeOnCompletion(taskId: string): Promise<CascadeResult> {
  const result: CascadeResult = { unblocked: 0, promoted: 0, stillBlocked: 0 }
  try {
    // The just-completed prerequisite — needed to evaluate edge satisfaction.
    const [prereqTask] = await db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, artifactUrl: tasks.artifactUrl })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)
    if (!prereqTask) return result

    // Edges where this task is the prerequisite → its dependents.
    const edges = await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.prerequisiteTaskId, taskId))
    if (edges.length === 0) return result

    // Hydrate the dependent tasks in one query.
    const dependentIds = [...new Set(edges.map(e => e.dependentTaskId))]
    const dependents = await db
      .select()
      .from(tasks)
      .where(inArray(tasks.id, dependentIds))
    const dependentById = new Map(dependents.map(d => [d.id, d]))

    for (const edge of edges) {
      const dependent = dependentById.get(edge.dependentTaskId)
      if (!dependent) continue

      // Is THIS edge now satisfied by the completion?
      if (!edgeSatisfied(edge.dependencyType, prereqTask)) continue
      result.unblocked++

      // Is the dependent now fully ready (all other prereqs + operator + budget)?
      const readiness = await evaluateReadiness(dependent.id)
      if (!readiness.ready) {
        result.stillBlocked++
        continue
      }

      // Enqueue a wakeup request. Readiness guarantees a registered, active
      // operator, so the operatorId FK on agent_wakeup_requests is satisfied.
      // A coalesced result means an earlier cascade (e.g. the inline PATCH-path
      // run, re-observed by the cron watermark) already promoted this dependent —
      // skip the side-effect logging so re-runs stay idempotent.
      const enqueued = await createWakeupRequest(
        dependent.assigneeId!,
        dependent.id,
        'dependency_cascade',
        { task: dependent, unblockedBy: { taskId: prereqTask.id, title: prereqTask.title } },
        {
          triggerDetail: `Unblocked by completion of "${prereqTask.title}"`,
          reason: `dependency_cascade:${edge.dependencyType}`,
          requestedByActorType: 'system',
          idempotencyKey: dependent.id,
        },
      )
      if (enqueued?.coalesced) continue
      result.promoted++

      // Structured task_event on the dependent.
      await db.insert(taskEvents).values({
        taskId: dependent.id,
        eventType: 'task_unblocked',
        actorType: 'system',
        actorName: 'dispatch-cascade',
        summaryNote: `Unblocked by completion of "${prereqTask.title}" (${edge.dependencyType})`,
        metadata: {
          unblockedByTaskId: prereqTask.id,
          dependencyType: edge.dependencyType,
          enqueuedWakeupFor: dependent.assigneeId,
        },
      })

      // Canonical activity_log event.
      await logActivity({
        workspaceId: dependent.workspaceId,
        actor: 'dispatch-cascade',
        action: 'dependency_cascade',
        entityType: 'task',
        entityId: dependent.id,
        entityTitle: dependent.title,
        description: `"${dependent.title}" unblocked by completion of "${prereqTask.title}" and queued for dispatch`,
        metadata: {
          unblockedByTaskId: prereqTask.id,
          dependencyType: edge.dependencyType,
          operatorId: dependent.assigneeId,
        },
        actorType: 'system',
        actorName: 'dispatch-cascade',
        eventFamily: 'agent',
        eventType: 'dependency_cascade',
        sourceSystem: 'api',
        status: 'success',
      })
    }
  } catch (err) {
    // Never let a cascade failure break the triggering task mutation.
    console.error('[cascadeOnCompletion]', err)
  }
  return result
}
