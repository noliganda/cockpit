import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [note] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: note });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const [existing] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [updated] = await db.update(notes).set({ ...body, updatedAt: new Date() }).where(eq(notes.id, id)).returning();

    await logActivity({
      workspaceId: existing.workspaceId,
      actor: 'user',
      action: 'updated',
      entityType: 'note',
      entityId: id,
      entityTitle: updated.title,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [existing] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.delete(notes).where(eq(notes.id, id));

    await logActivity({
      workspaceId: existing.workspaceId,
      actor: 'user',
      action: 'deleted',
      entityType: 'note',
      entityId: id,
      entityTitle: existing.title,
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
