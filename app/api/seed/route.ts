import { NextResponse } from 'next/server';
import { syncAllWorkspaces } from '@/lib/notion-sync';
import { db } from '@/lib/db';
import { workspaces } from '@/lib/db/schema';
import { WORKSPACES } from '@/types';

export async function POST() {
  try {
    // Seed workspace records
    for (const ws of WORKSPACES) {
      await db
        .insert(workspaces)
        .values({
          name: ws.name,
          slug: ws.id,
          color: ws.color,
          icon: ws.icon,
        })
        .onConflictDoNothing();
    }

    // Trigger Notion sync to populate tasks
    const syncResults = await syncAllWorkspaces();

    return NextResponse.json({
      data: {
        message: 'Database seeded successfully',
        workspacesSeeded: WORKSPACES.length,
        syncResults,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
