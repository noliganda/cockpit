import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sprints } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().default('planning'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace');

    const result = workspaceId
      ? await db.select().from(sprints).where(eq(sprints.workspaceId, workspaceId)).orderBy(desc(sprints.createdAt))
      : await db.select().from(sprints).orderBy(desc(sprints.createdAt));

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

    const { startDate, endDate, ...rest } = parsed.data;
    const [sprint] = await db
      .insert(sprints)
      .values({
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      })
      .returning();

    await logActivity({
      workspaceId: sprint.workspaceId,
      actor: 'user',
      action: 'created',
      entityType: 'sprint',
      entityId: sprint.id,
      entityTitle: sprint.name,
    });

    return NextResponse.json({ data: sprint }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
