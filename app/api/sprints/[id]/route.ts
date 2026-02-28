import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sprints } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
    if (!sprint) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: sprint });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const [existing] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);

    const [updated] = await db.update(sprints).set(updateData).where(eq(sprints.id, id)).returning();

    await logActivity({
      workspaceId: existing.workspaceId,
      actor: 'user',
      action: 'updated',
      entityType: 'sprint',
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
    const [existing] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.delete(sprints).where(eq(sprints.id, id));

    await logActivity({
      workspaceId: existing.workspaceId,
      actor: 'user',
      action: 'deleted',
      entityType: 'sprint',
      entityId: id,
      entityTitle: existing.name,
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
