/**
 * GET  /api/sync/notion — returns sync status (last run, task counts)
 * POST /api/sync/notion — triggers a full one-way Notion → DB sync
 *
 * ONE-WAY ONLY: pulls from Notion, never writes back.
 *
 * Env vars:
 *   NOTION_API_KEY         — Notion integration token
 *   NOTION_KORUS_TASKS_DB  — KORUS tasks DB ID
 *   NOTION_BF_TASKS_DB     — Byron Film tasks DB ID
 *   NOTION_OC_TASKS_DB     — Oli & Charlie tasks DB ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, isNotNull, max, count } from 'drizzle-orm';
import { pullAllWorkspaces, isNotionConfigured } from '@/lib/notion-sync';

// ─── GET: sync status ─────────────────────────────────────────────────────────

export async function GET() {
  const configured = isNotionConfigured();

  try {
    // Count tasks synced from Notion and find most recent sync time
    const [syncedCount] = await db
      .select({ total: count() })
      .from(schema.tasks)
      .where(isNotNull(schema.tasks.notionId));

    const [latestSync] = await db
      .select({ lastSynced: max(schema.tasks.notionLastSynced) })
      .from(schema.tasks)
      .where(isNotNull(schema.tasks.notionLastSynced));

    // Count per workspace
    const workspaceCounts: Record<string, number> = {};
    for (const wsId of ['korus', 'byron-film', 'private']) {
      const [row] = await db
        .select({ total: count() })
        .from(schema.tasks)
        .where(eq(schema.tasks.workspaceId, wsId));
      workspaceCounts[wsId] = row?.total ?? 0;
    }

    const notionCounts: Record<string, number> = {};
    for (const wsId of ['korus', 'byron-film', 'private']) {
      const allForWs = await db
        .select({ notionId: schema.tasks.notionId })
        .from(schema.tasks)
        .where(eq(schema.tasks.workspaceId, wsId));
      notionCounts[wsId] = allForWs.filter((t) => t.notionId !== null).length;
    }

    return NextResponse.json({
      configured,
      totalSyncedTasks: syncedCount?.total ?? 0,
      lastSyncedAt: latestSync?.lastSynced?.toISOString() ?? null,
      byWorkspace: notionCounts,
      totalTasksPerWorkspace: workspaceCounts,
      databases: {
        korus: process.env.NOTION_KORUS_TASKS_DB || 'e98b3f42-2fba-4c5c-9f3c-45078e935c89',
        'byron-film': process.env.NOTION_BF_TASKS_DB || '40586981-fc6a-46d4-ac30-7f8ab7b50f5b',
        private: process.env.NOTION_OC_TASKS_DB || '7412d365-b9e6-4ebf-8a07-055ff052e9fb',
      },
    });
  } catch (err) {
    console.error('[GET /api/sync/notion] DB error:', err);
    return NextResponse.json({
      configured,
      totalSyncedTasks: 0,
      lastSyncedAt: null,
      byWorkspace: {},
      error: 'Failed to query sync status',
    });
  }
}

// ─── POST: trigger sync ───────────────────────────────────────────────────────

export async function POST(_request: NextRequest) {
  if (!isNotionConfigured()) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY not configured' },
      { status: 400 },
    );
  }

  const startedAt = new Date();
  const report = {
    workspaces: [] as Array<{
      workspaceId: string;
      created: number;
      updated: number;
      skipped: number;
      error: string | null;
    }>,
    totalCreated: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    errors: [] as string[],
    syncedAt: startedAt.toISOString(),
    durationMs: 0,
  };

  try {
    const { byWorkspace, errors } = await pullAllWorkspaces();

    // Record pull errors
    for (const e of errors) {
      report.errors.push(`[${e.workspaceId}] ${e.error}`);
      report.workspaces.push({
        workspaceId: e.workspaceId,
        created: 0,
        updated: 0,
        skipped: 0,
        error: e.error,
      });
    }

    // Upsert tasks per workspace
    for (const [workspaceId, tasks] of Object.entries(byWorkspace)) {
      const wsResult = {
        workspaceId,
        created: 0,
        updated: 0,
        skipped: 0,
        error: null as string | null,
      };

      for (const t of tasks) {
        try {
          // Look up existing task by notionId
          const existing = await db
            .select({ id: schema.tasks.id, notionLastSynced: schema.tasks.notionLastSynced })
            .from(schema.tasks)
            .where(eq(schema.tasks.notionId, t.notionId))
            .limit(1);

          const now = new Date();
          const notionEditedAt = new Date(t.notionLastEditedTime);

          if (existing.length > 0) {
            // Update if Notion has been edited since last sync (or never synced)
            const lastSynced = existing[0].notionLastSynced;
            if (lastSynced && notionEditedAt <= lastSynced) {
              wsResult.skipped++;
              continue;
            }

            await db
              .update(schema.tasks)
              .set({
                title: t.title,
                status: t.status,
                assignee: t.assignee,
                dueDate: t.dueDate,
                description: t.description,
                urgent: t.urgent,
                important: t.important,
                effort: t.effort as schema.Task['effort'],
                impact: t.impact as schema.Task['impact'],
                tags: t.tags,
                workspaceId: t.workspaceId,
                notionLastSynced: now,
                updatedAt: now,
              })
              .where(eq(schema.tasks.id, existing[0].id));

            wsResult.updated++;
          } else {
            // Insert new task
            const shortId = t.notionId.replace(/-/g, '').slice(0, 20);
            const id = `notion-${shortId}`;

            await db
              .insert(schema.tasks)
              .values({
                id,
                title: t.title,
                description: t.description,
                status: t.status,
                workspaceId: t.workspaceId,
                assignee: t.assignee,
                dueDate: t.dueDate,
                urgent: t.urgent,
                important: t.important,
                effort: t.effort as schema.Task['effort'],
                impact: t.impact as schema.Task['impact'],
                tags: t.tags,
                notionId: t.notionId,
                notionLastSynced: now,
                // nulls for optional relations
                areaId: null,
                projectId: null,
                sprintId: null,
                duration: null,
                customFields: {},
                completedAt: null,
                blockedReason: null,
                createdAt: now,
                updatedAt: now,
              })
              .onConflictDoNothing();

            wsResult.created++;
          }
        } catch (taskErr) {
          console.error(`[notion-sync] Failed to upsert task "${t.title}":`, taskErr);
          wsResult.skipped++;
        }
      }

      report.workspaces.push(wsResult);
      report.totalCreated += wsResult.created;
      report.totalUpdated += wsResult.updated;
      report.totalSkipped += wsResult.skipped;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    report.errors.push(`Sync failed: ${msg}`);
    console.error('[POST /api/sync/notion] Fatal error:', err);

    return NextResponse.json(
      { error: 'Sync failed', details: report },
      { status: 500 },
    );
  }

  report.durationMs = Date.now() - startedAt.getTime();
  console.log(
    `[notion-sync] Done in ${report.durationMs}ms — created: ${report.totalCreated}, updated: ${report.totalUpdated}, skipped: ${report.totalSkipped}`,
  );

  return NextResponse.json({ success: true, report });
}
