import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organisations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [org] = await db.select().from(organisations).where(eq(organisations.id, id)).limit(1);
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: org });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const [existing] = await db.select().from(organisations).where(eq(organisations.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [updated] = await db.update(organisations).set({ ...body, updatedAt: new Date() }).where(eq(organisations.id, id)).returning();

    await logActivity({
      workspaceId: existing.workspaceId,
      actor: 'user',
      action: 'updated',
      entityType: 'organisation',
      entityId: id,
      entityTitle: updated.name,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [existing] = await db.select().from(organisations).where(eq(organisations.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.delete(organisations).where(eq(organisations.id, id));

    await logActivity({
      workspaceId: existing.workspaceId,
      actor: 'user',
      action: 'deleted',
      entityType: 'organisation',
      entityId: id,
      entityTitle: existing.name,
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
