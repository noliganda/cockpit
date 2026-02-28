import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { areas } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  order: z.number().default(0),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace');

    const result = workspaceId
      ? await db.select().from(areas).where(eq(areas.workspaceId, workspaceId)).orderBy(asc(areas.order))
      : await db.select().from(areas).orderBy(asc(areas.order));

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

    const [area] = await db.insert(areas).values(parsed.data).returning();

    await logActivity({
      workspaceId: area.workspaceId,
      actor: 'user',
      action: 'created',
      entityType: 'area',
      entityId: area.id,
      entityTitle: area.name,
    });

    return NextResponse.json({ data: area }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
