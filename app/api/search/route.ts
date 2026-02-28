import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { activityLog } from '@/lib/db/schema';
import { ilike, or, desc, eq, and } from 'drizzle-orm';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1),
  workspace: z.string().optional(),
  limit: z.number().default(20),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = searchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { query, workspace, limit } = parsed.data;
    const pattern = `%${query}%`;

    const titleFilter = or(
      ilike(activityLog.entityTitle, pattern),
      ilike(activityLog.entityType, pattern),
    );

    const result = workspace
      ? await db.select().from(activityLog)
          .where(and(titleFilter, eq(activityLog.workspaceId, workspace)))
          .orderBy(desc(activityLog.timestamp))
          .limit(limit)
      : await db.select().from(activityLog)
          .where(titleFilter)
          .orderBy(desc(activityLog.timestamp))
          .limit(limit);

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
