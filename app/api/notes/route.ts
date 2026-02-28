import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const createSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().optional(),
  pinned: z.boolean().default(false),
  projectId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace');

    const result = workspaceId
      ? await db.select().from(notes).where(eq(notes.workspaceId, workspaceId)).orderBy(desc(notes.createdAt))
      : await db.select().from(notes).orderBy(desc(notes.createdAt));

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

    const { projectId, ...rest } = parsed.data;
    const [note] = await db.insert(notes).values({ ...rest, projectId: projectId ?? null }).returning();

    await logActivity({
      workspaceId: note.workspaceId,
      actor: 'user',
      action: 'created',
      entityType: 'note',
      entityId: note.id,
      entityTitle: note.title,
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
