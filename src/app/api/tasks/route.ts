import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { DEFAULT_STATUSES, DEFAULT_AREAS, DEFAULT_TAGS } from '@/lib/types';

/** Recalculate and persist a project's progress based on its tasks. Fire-and-forget. */
async function recalcProjectProgress(projectId: string): Promise<void> {
  try {
    const projectTasks = await db
      .select({ status: schema.tasks.status })
      .from(schema.tasks)
      .where(eq(schema.tasks.projectId, projectId));

    if (projectTasks.length === 0) return;

    // Check which statuses are marked isCompleted in customStatuses
    const allStatuses = await db.select().from(schema.customStatuses);
    const completedIds = new Set(
      allStatuses.filter((s) => s.isCompleted).map((s) => s.id),
    );

    // Also treat these standard status names as complete
    const DONE_STATUSES = new Set(['done', 'completed', 'complete', 'closed', 'delivered']);

    const total = projectTasks.length;
    const done = projectTasks.filter(
      (t) => completedIds.has(t.status ?? '') || DONE_STATUSES.has((t.status ?? '').toLowerCase()),
    ).length;

    const progress = Math.round((done / total) * 100);

    await db
      .update(schema.projects)
      .set({ progress, updatedAt: new Date() })
      .where(eq(schema.projects.id, projectId));
  } catch {
    // Non-fatal
  }
}

// GET /api/tasks — list tasks with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');
  const statusId = searchParams.get('status');
  const areaId = searchParams.get('areaId');
  const projectId = searchParams.get('projectId');
  const sprintId = searchParams.get('sprintId');
  const assignee = searchParams.get('assignee');
  const tag = searchParams.get('tag');
  const includeStatuses = searchParams.get('includeStatuses') === 'true';
  const includeAreas = searchParams.get('includeAreas') === 'true';
  const includeTags = searchParams.get('includeTags') === 'true';

  try {
    const conditions = [];
    // 'all' is a special value meaning "no workspace filter"
    if (workspaceId && workspaceId !== 'all') conditions.push(eq(schema.tasks.workspaceId, workspaceId));
    if (statusId) conditions.push(eq(schema.tasks.status, statusId));
    if (areaId) conditions.push(eq(schema.tasks.areaId, areaId));
    if (projectId) conditions.push(eq(schema.tasks.projectId, projectId));
    if (sprintId) conditions.push(eq(schema.tasks.sprintId, sprintId));
    if (assignee) conditions.push(eq(schema.tasks.assignee, assignee));

    const rows = await db
      .select()
      .from(schema.tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.tasks.createdAt));

    let tasks = rows.map(dbTaskToApi);

    // Filter by tag (can't do easily in SQL with jsonb array)
    if (tag) {
      tasks = tasks.filter((t) => Array.isArray(t.tags) && t.tags.includes(tag));
    }

    const response: Record<string, unknown> = { tasks };

    if (includeStatuses) {
      const wsId = workspaceId || 'private';
      const dbStatuses = await db
        .select()
        .from(schema.customStatuses)
        .where(eq(schema.customStatuses.workspaceId, wsId))
        .orderBy(schema.customStatuses.order);

      response.statuses = dbStatuses.length > 0
        ? { [wsId]: dbStatuses.map(s => ({ id: s.id, name: s.name, color: s.color, order: s.order, isDefault: s.isDefault, isCompleted: s.isCompleted })) }
        : DEFAULT_STATUSES;
    }

    if (includeAreas) {
      const wsId = workspaceId || 'private';
      const dbAreas = await db
        .select()
        .from(schema.areas)
        .where(eq(schema.areas.workspaceId, wsId))
        .orderBy(schema.areas.order);

      response.areas = dbAreas.length > 0
        ? { [wsId]: dbAreas.map(a => ({ id: a.id, name: a.name, workspaceId: a.workspaceId, order: a.order })) }
        : DEFAULT_AREAS;
    }

    if (includeTags) {
      response.tags = DEFAULT_TAGS;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

// POST /api/tasks — create a task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workspaceId = body.workspaceId || 'private';

    // Get default status for this workspace
    const statuses = await db
      .select()
      .from(schema.customStatuses)
      .where(and(
        eq(schema.customStatuses.workspaceId, workspaceId),
        eq(schema.customStatuses.isDefault, true),
      ));
    const defaultStatus = statuses[0]?.id || DEFAULT_STATUSES[workspaceId]?.[0]?.id || 'todo';

    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();

    const values: schema.Task = {
      id,
      title: body.title,
      description: body.description || null,
      status: body.status || defaultStatus,
      workspaceId,
      areaId: body.areaId || null,
      projectId: body.projectId || null,
      sprintId: body.sprintId || null,
      assignee: body.assignee || 'Unassigned',
      dueDate: body.dueDate || null,
      duration: body.duration || null,
      tags: body.tags || [],
      urgent: body.urgent ?? false,
      important: body.important ?? false,
      effort: body.effort || 'Medium',
      impact: body.impact || 'Medium',
      customFields: body.customFields || {},
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      blockedReason: body.blockedReason || null,
      notionId: null,
      notionLastSynced: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schema.tasks).values(values);

    // Trigger project progress recalc if task is in a project
    if (values.projectId) {
      recalcProjectProgress(values.projectId); // fire-and-forget
    }

    return NextResponse.json({ task: dbTaskToApi(values) }, { status: 201 });
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PATCH /api/tasks — update a task
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    const existing = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id));
    if (existing.length === 0) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const task = existing[0];
    const now = new Date();

    // Auto-set completedAt when status becomes a completed status
    let completedAt = task.completedAt;
    if (updates.status && updates.status !== task.status) {
      const statuses = await db
        .select()
        .from(schema.customStatuses)
        .where(eq(schema.customStatuses.id, updates.status));
      const isCompleted = statuses[0]?.isCompleted ?? false;
      completedAt = isCompleted ? now : null;
    }

    const updateValues: Partial<schema.Task> = {
      ...filterTaskUpdates(updates),
      updatedAt: now,
      completedAt,
    };

    const [updated] = await db
      .update(schema.tasks)
      .set(updateValues)
      .where(eq(schema.tasks.id, id))
      .returning();

    // Auto-recalculate project progress when status changes
    const effectiveProjectId = updated.projectId ?? task.projectId;
    if (updates.status && updates.status !== task.status && effectiveProjectId) {
      recalcProjectProgress(effectiveProjectId); // fire-and-forget
    }

    return NextResponse.json({ task: dbTaskToApi(updated) });
  } catch (err) {
    console.error('PATCH /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks?id=xxx
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

  try {
    const result = await db.delete(schema.tasks).where(eq(schema.tasks.id, id)).returning();
    if (result.length === 0) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Recalc project progress if task was in a project
    const deletedTask = result[0];
    if (deletedTask?.projectId) {
      recalcProjectProgress(deletedTask.projectId); // fire-and-forget
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

// PUT /api/tasks — bulk operations
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, data } = body;

    if (operation === 'batch-move') {
      const { taskIds, newStatus } = data;
      const statusRow = await db.select().from(schema.customStatuses).where(eq(schema.customStatuses.id, newStatus));
      const isCompleted = statusRow[0]?.isCompleted ?? false;
      const now = new Date();

      for (const id of taskIds) {
        await db.update(schema.tasks)
          .set({ status: newStatus, updatedAt: now, completedAt: isCompleted ? now : null })
          .where(eq(schema.tasks.id, id));
      }
      return NextResponse.json({ updated: taskIds.length });
    }

    if (operation === 'reorder-statuses') {
      const { workspaceId, statusIds } = data;
      for (let i = 0; i < statusIds.length; i++) {
        await db.update(schema.customStatuses)
          .set({ order: i })
          .where(and(
            eq(schema.customStatuses.id, statusIds[i]),
            eq(schema.customStatuses.workspaceId, workspaceId),
          ));
      }
      const updated = await db.select().from(schema.customStatuses)
        .where(eq(schema.customStatuses.workspaceId, workspaceId))
        .orderBy(schema.customStatuses.order);
      return NextResponse.json({ statuses: updated });
    }

    return NextResponse.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (err) {
    console.error('PUT /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to bulk update' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dbTaskToApi(task: schema.Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    workspaceId: task.workspaceId,
    areaId: task.areaId,
    projectId: task.projectId,
    sprintId: task.sprintId,
    assignee: task.assignee,
    dueDate: task.dueDate,
    duration: task.duration,
    tags: task.tags || [],
    urgent: task.urgent,
    important: task.important,
    effort: task.effort,
    impact: task.impact,
    customFields: task.customFields || {},
    completedAt: task.completedAt?.toISOString() ?? null,
    blockedReason: task.blockedReason,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

const ALLOWED_TASK_FIELDS = new Set([
  'title', 'description', 'status', 'workspaceId', 'areaId', 'projectId', 'sprintId',
  'assignee', 'dueDate', 'duration', 'tags', 'urgent', 'important', 'effort', 'impact',
  'customFields', 'blockedReason',
]);

function filterTaskUpdates(updates: Record<string, unknown>): Partial<schema.Task> {
  const filtered: Partial<schema.Task> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_TASK_FIELDS.has(key)) {
      (filtered as Record<string, unknown>)[key] = value;
    }
  }
  return filtered;
}
