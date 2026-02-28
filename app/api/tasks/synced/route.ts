import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { isNotNull } from 'drizzle-orm';

// GET /api/tasks/synced — returns all Notion-synced tasks in the format the UI expects
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(schema.tasks)
      .where(isNotNull(schema.tasks.notionId));

    // Map DB rows to the Task type the frontend expects
    const tasks = rows.map(row => ({
      id: row.notionId || row.id,
      title: row.title,
      description: row.description || '',
      status: row.status || 'todo',
      workspaceId: row.workspaceId || 'byron-film',
      assignee: row.assignee || 'Unassigned',
      dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
      urgent: row.urgent || false,
      important: row.important || false,
      effort: row.effort || 'Medium',
      impact: row.impact || 'Medium',
      tags: row.tags || [],
      areaId: row.areaId || null,
      projectId: row.projectId || null,
      notionId: row.notionId,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ tasks, count: tasks.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
