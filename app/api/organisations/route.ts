import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organisations } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  industry: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  pipelineStage: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace');

    const result = workspaceId
      ? await db.select().from(organisations).where(eq(organisations.workspaceId, workspaceId)).orderBy(desc(organisations.createdAt))
      : await db.select().from(organisations).orderBy(desc(organisations.createdAt));

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

    const [org] = await db.insert(organisations).values(parsed.data).returning();

    await logActivity({
      workspaceId: org.workspaceId,
      actor: 'user',
      action: 'created',
      entityType: 'organisation',
      entityId: org.id,
      entityTitle: org.name,
    });

    return NextResponse.json({ data: org }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
