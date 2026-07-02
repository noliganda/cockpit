/**
 * Dispatch readiness evaluation.
 *
 * Phase 1 of the dispatch engine (see
 * docs/current/architecture/COCKPIT-DISPATCH-ENGINE-SPEC.md §5.1).
 *
 * `evaluateReadiness` answers "is this task ready to be dispatched?". It is
 * read-only with ONE deliberate exception (spec §9, Phase 4): discovering an
 * over-budget ACTIVE operator auto-pauses it (status='paused',
 * pauseReason='budget_exceeded') and notifies via task_event + activity_log.
 * The pause is idempotent (guarded UPDATE ... WHERE status='active') and never
 * throws — a notification failure must not break the readiness answer.
 *
 * Checks: assignment, task state, dependency satisfaction, operator
 * existence/activity/budget, per-operator concurrency (Phase 2, migration 0010),
 * and no in-flight session. A missing/unregistered adapter is reported as a
 * blocker rather than an error so seeded-but-not-yet-dispatchable operators
 * (e.g. claude-code before Phase 3) simply never dispatch.
 */
import { db } from '@/lib/db'
import { tasks, operators, taskDependencies, agentTaskSessions, taskEvents } from '@/lib/db/schema'
import { eq, inArray, and } from 'drizzle-orm'
import { toNormalized, isKnownStatus } from '@/lib/task-lifecycle'
import { logActivity } from '@/lib/activity'
import { getAdapter } from './adapters'

export interface ReadinessResult {
  ready: boolean
  /** Human-readable reasons the task is not ready (empty when ready). */
  blockers: string[]
}

/** Normalized statuses a task may be in and still be eligible to dispatch. */
const DISPATCHABLE_STATUSES = new Set(['draft', 'queued'])

/**
 * Whether a single prerequisite satisfies a dependency edge of the given type.
 * - blocks:         prerequisite must be Done.
 * - needs_review:   prerequisite must be in review or Done.
 * - needs_artifact: prerequisite must be Done AND expose an artifactUrl.
 */
function isPrerequisiteSatisfied(
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

/**
 * Auto-pause an over-budget operator (spec §9 budget guard). Idempotent: the
 * guarded UPDATE only fires while the operator is still 'active', so repeated
 * readiness checks can't stack pauses or duplicate notifications. Never throws.
 */
async function autoPauseOverBudget(
  operator: typeof operators.$inferSelect,
  triggeringTaskId: string,
): Promise<void> {
  try {
    if (operator.status !== 'active') return
    const [paused] = await db
      .update(operators)
      .set({ status: 'paused', pausedAt: new Date(), pauseReason: 'budget_exceeded' })
      .where(and(eq(operators.id, operator.id), eq(operators.status, 'active')))
      .returning()
    if (!paused) return // raced another readiness check — it did the notifying

    const detail = `Operator "${operator.id}" auto-paused: spent ${operator.spentMonthlyCents}¢ of ${operator.budgetMonthlyCents}¢ monthly budget`
    await db.insert(taskEvents).values({
      taskId: triggeringTaskId,
      eventType: 'operator_paused',
      actorType: 'system',
      actorName: 'dispatch-readiness',
      summaryNote: `${detail} — task cannot dispatch until the budget is raised or spend reset`,
      metadata: {
        operatorId: operator.id,
        pauseReason: 'budget_exceeded',
        budgetMonthlyCents: operator.budgetMonthlyCents,
        spentMonthlyCents: operator.spentMonthlyCents,
      },
    })
    await logActivity({
      workspaceId: 'personal',
      actor: 'dispatch-readiness',
      action: 'operator_paused',
      entityType: 'operator',
      entityId: operator.id,
      entityTitle: operator.name,
      description: detail,
      metadata: { pauseReason: 'budget_exceeded', budgetMonthlyCents: operator.budgetMonthlyCents, spentMonthlyCents: operator.spentMonthlyCents, triggeringTaskId },
      actorType: 'system',
      actorName: 'dispatch-readiness',
      eventFamily: 'agent',
      eventType: 'operator_paused',
      sourceSystem: 'api',
      status: 'success',
    })
  } catch (err) {
    console.error('[autoPauseOverBudget]', operator.id, err)
  }
}

export async function evaluateReadiness(taskId: string): Promise<ReadinessResult> {
  const blockers: string[] = []

  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
  if (!task) {
    return { ready: false, blockers: ['task not found'] }
  }

  // 1. Must be assigned to an executable operator (agent or function harness).
  const isAgentLike = task.assigneeType === 'agent' || task.assigneeType === 'function'
  if (!isAgentLike || !task.assigneeId) {
    blockers.push('not assigned to an agent or function operator')
  }

  // 2. Task must be in a dispatchable state (To Do / Backlog), not already
  //    in progress, blocked, done, or cancelled. Unknown status strings are
  //    NEVER dispatchable — toNormalized() falls back to 'queued' for unknowns
  //    (stray legacy values like 'Completed' exist in prod data), so the status
  //    must be recognized before normalization is trusted.
  if (!isKnownStatus(task.status)) {
    blockers.push(`status "${task.status}" is not recognized as dispatchable`)
  } else if (!DISPATCHABLE_STATUSES.has(toNormalized(task.status))) {
    blockers.push(`status "${task.status}" is not dispatchable`)
  }

  // 3. All prerequisites satisfied.
  const deps = await db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.dependentTaskId, taskId))
  if (deps.length > 0) {
    const prereqIds = deps.map(d => d.prerequisiteTaskId)
    const prereqs = await db
      .select({ id: tasks.id, status: tasks.status, artifactUrl: tasks.artifactUrl })
      .from(tasks)
      .where(inArray(tasks.id, prereqIds))
    const prereqById = new Map(prereqs.map(p => [p.id, p]))
    for (const dep of deps) {
      const prereq = prereqById.get(dep.prerequisiteTaskId)
      if (!prereq || !isPrerequisiteSatisfied(dep.dependencyType, prereq)) {
        blockers.push(`prerequisite ${dep.prerequisiteTaskId} not satisfied (${dep.dependencyType})`)
      }
    }
  }

  // 4. Operator must exist, be active, and not be over budget.
  if (task.assigneeId) {
    const [operator] = await db
      .select()
      .from(operators)
      .where(eq(operators.id, task.assigneeId))
      .limit(1)
    if (!operator) {
      blockers.push(`operator "${task.assigneeId}" is not registered`)
    } else {
      if (operator.status !== 'active') {
        blockers.push(`operator "${operator.id}" is ${operator.status}`)
      }
      // Budget acts as a ceiling only when one is set (>0). 0 = unmetered.
      if (operator.budgetMonthlyCents > 0 && operator.spentMonthlyCents >= operator.budgetMonthlyCents) {
        blockers.push(`operator "${operator.id}" is over budget`)
        await autoPauseOverBudget(operator, taskId)
      }
      if (!operator.adapterType) {
        blockers.push(`operator "${operator.id}" has no adapter configured`)
      } else if (!getAdapter(operator.adapterType)) {
        blockers.push(`operator "${operator.id}" adapter "${operator.adapterType}" is not registered (yet)`)
      }
      if (operator.activeRunCount >= operator.maxConcurrent) {
        blockers.push(`operator "${operator.id}" is at max concurrency (${operator.activeRunCount}/${operator.maxConcurrent})`)
      }
    }
  }

  // 5. No in-flight session already working this task.
  const activeSessions = await db
    .select({ id: agentTaskSessions.id })
    .from(agentTaskSessions)
    .where(and(eq(agentTaskSessions.taskId, taskId), inArray(agentTaskSessions.status, ['active', 'queued'])))
    .limit(1)
  if (activeSessions.length > 0) {
    blockers.push('task already has an active session')
  }

  return { ready: blockers.length === 0, blockers }
}
