import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  organisationId: z.string().uuid().optional(),
  role: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  pipelineStage: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace');

    const result = workspaceId
      ? await db.select().from(contacts).where(eq(contacts.workspaceId, workspaceId)).orderBy(desc(contacts.createdAt))
      : await db.select().from(contacts).orderBy(desc(contacts.createdAt));

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

    const { organisationId, ...rest } = parsed.data;
    const [contact] = await db
      .insert(contacts)
      .values({ ...rest, organisationId: organisationId ?? null })
      .returning();

    await logActivity({
      workspaceId: contact.workspaceId,
      actor: 'user',
      action: 'created',
      entityType: 'contact',
      entityId: contact.id,
      entityTitle: contact.name,
    });

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
