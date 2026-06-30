import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, taskDependencies } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { getSession, getSessionData } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'

// ── Task dependency graph ────────────────────────────────────────────────────
// [id] is the DEPENDENT task. A prerequisite must be satisfied before the
// dependent can be dispatched. See COCKPIT-DISPATCH-ENGINE-SPEC.md §6.3.

const postSchema = z.object({
  prerequisiteTaskId: z.string().uuid(),
  dependencyType: z.enum(['blocks', 'needs_artifact', 'needs_review']).default('blocks'),
})

// GET — list this task's dependencies: incoming (its prerequisites) + outgoing (its dependents).
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.', code: 'unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Incoming: edges where this task is the dependent → its prerequisites.
    const incoming = await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.dependentTaskId, id))
    // Outgoing: edges where this task is the prerequisite → its dependents.
    const outgoing = await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.prerequisiteTaskId, id))

    // Hydrate referenced task titles/statuses in one query.
    const relatedIds = [
      ...new Set([
        ...incoming.map(e => e.prerequisiteTaskId),
        ...outgoing.map(e => e.dependentTaskId),
      ]),
    ]
    const related = relatedIds.length
      ? await db
          .select({ id: tasks.id, title: tasks.title, status: tasks.status, artifactUrl: tasks.artifactUrl })
          .from(tasks)
          .where(inArray(tasks.id, relatedIds))
      : []
    const taskById = new Map(related.map(t => [t.id, t]))

    return NextResponse.json({
      prerequisites: incoming.map(e => ({
        id: e.id,
        dependencyType: e.dependencyType,
        prerequisiteTaskId: e.prerequisiteTaskId,
        prerequisiteTask: taskById.get(e.prerequisiteTaskId) ?? null,
        createdAt: e.createdAt,
      })),
      dependents: outgoing.map(e => ({
        id: e.id,
        dependencyType: e.dependencyType,
        dependentTaskId: e.dependentTaskId,
        dependentTask: taskById.get(e.dependentTaskId) ?? null,
        createdAt: e.createdAt,
      })),
    })
  } catch (error) {
    console.error('[GET /api/tasks/[id]/dependencies]', error)
    return NextResponse.json({ error: 'Internal server error', code: 'server_error' }, { status: 500 })
  }
}

// POST — add a prerequisite for this (dependent) task.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionData = await getSessionData()
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Not authenticated. Send Authorization: Bearer $COCKPIT_API_TOKEN.', code: 'unauthorized' },
        { status: 401 },
      )
    }
    if (sessionData.role === 'guest') {
      return NextResponse.json({ error: 'Guests cannot edit dependencies.', code: 'forbidden' }, { status: 403 })
    }

    const { id: dependentTaskId } = await params
    const body = (await request.json()) as unknown
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format(), code: 'validation_error' }, { status: 400 })
    }
    const { prerequisiteTaskId, dependencyType } = parsed.data

    // A task cannot depend on itself.
    if (prerequisiteTaskId === dependentTaskId) {
      return NextResponse.json({ error: 'A task cannot depend on itself.', code: 'validation_error' }, { status: 422 })
    }

    // Both tasks must exist.
    const found = await db
      .select({ id: tasks.id, title: tasks.title, workspaceId: tasks.workspaceId })
      .from(tasks)
      .where(inArray(tasks.id, [dependentTaskId, prerequisiteTaskId]))
    const dependent = found.find(t => t.id === dependentTaskId)
    const prerequisite = found.find(t => t.id === prerequisiteTaskId)
    if (!dependent) {
      return NextResponse.json({ error: 'Dependent task not found.', code: 'not_found' }, { status: 404 })
    }
    if (!prerequisite) {
      return NextResponse.json({ error: 'Prerequisite task not found.', code: 'not_found' }, { status: 404 })
    }

    // Reject an immediate cycle: prerequisite must not already depend on this task.
    const [reverse] = await db
      .select({ id: taskDependencies.id })
      .from(taskDependencies)
      .where(and(
        eq(taskDependencies.prerequisiteTaskId, dependentTaskId),
        eq(taskDependencies.dependentTaskId, prerequisiteTaskId),
      ))
      .limit(1)
    if (reverse) {
      return NextResponse.json(
        { error: 'That would create a dependency cycle (the prerequisite already depends on this task).', code: 'validation_error' },
        { status: 422 },
      )
    }

    // Reject duplicates (also enforced by the unique index).
    const [existing] = await db
      .select({ id: taskDependencies.id })
      .from(taskDependencies)
      .where(and(
        eq(taskDependencies.prerequisiteTaskId, prerequisiteTaskId),
        eq(taskDependencies.dependentTaskId, dependentTaskId),
      ))
      .limit(1)
    if (existing) {
      return NextResponse.json({ error: 'Dependency already exists.', code: 'conflict' }, { status: 409 })
    }

    const [edge] = await db
      .insert(taskDependencies)
      .values({ prerequisiteTaskId, dependentTaskId, dependencyType })
      .returning()

    await logActivity({
      workspaceId: dependent.workspaceId,
      actor: sessionData.harnessName ?? sessionData.email,
      action: 'dependency_added',
      entityType: 'task',
      entityId: dependentTaskId,
      entityTitle: dependent.title,
      description: `"${dependent.title}" now depends on "${prerequisite.title}" (${dependencyType})`,
      metadata: { prerequisiteTaskId, dependencyType },
      actorType: sessionData.harnessName ? 'agent' : 'human',
      actorId: sessionData.userId,
      actorName: sessionData.harnessName ?? sessionData.email,
      eventFamily: 'task',
      eventType: 'dependency_added',
      sourceSystem: sessionData.harnessName ? 'api' : 'dashboard',
      status: 'success',
    })

    return NextResponse.json(edge, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tasks/[id]/dependencies]', error)
    return NextResponse.json({ error: 'Internal server error', code: 'server_error' }, { status: 500 })
  }
}
