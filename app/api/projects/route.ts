import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().default('active'),
  areaId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.union([z.number(), z.string()]).optional(),
  region: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace');

    const result = workspaceId
      ? await db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).orderBy(desc(projects.createdAt))
      : await db.select().from(projects).orderBy(desc(projects.createdAt));

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { startDate, endDate, areaId, budget, ...rest } = parsed.data;
    const [project] = await db
      .insert(projects)
      .values({
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        areaId: areaId ?? null,
        budget: budget != null ? String(budget) : null,
      })
      .returning();

    await logActivity({
      workspaceId: project.workspaceId,
      actor: 'user',
      action: 'created',
      entityType: 'project',
      entityId: project.id,
      entityTitle: project.name,
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
