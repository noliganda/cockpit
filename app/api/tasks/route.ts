import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const createTaskSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().default('todo'),
  priority: z.string().optional(),
  impact: z.string().optional(),
  effort: z.string().optional(),
  urgent: z.boolean().default(false),
  important: z.boolean().default(false),
  dueDate: z.string().optional(),
  assignee: z.string().optional(),
  tags: z.array(z.string()).default([]),
  areaId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  sprintId: z.string().uuid().optional(),
  region: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace');

    const query = db.select().from(tasks).orderBy(desc(tasks.createdAt));

    const result = workspaceId
      ? await db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)).orderBy(desc(tasks.createdAt))
      : await query;

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { dueDate, areaId, projectId, sprintId, ...rest } = parsed.data;

    const [task] = await db
      .insert(tasks)
      .values({
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : null,
        areaId: areaId ?? null,
        projectId: projectId ?? null,
        sprintId: sprintId ?? null,
      })
      .returning();

    await logActivity({
      workspaceId: task.workspaceId,
      actor: 'user',
      action: 'created',
      entityType: 'task',
      entityId: task.id,
      entityTitle: task.title,
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
