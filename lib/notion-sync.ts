import { Client } from '@notionhq/client';
import { db } from './db';
import { tasks } from './db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from './activity';
import type { NotionSyncResult } from '@/types';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

type WorkspaceMapping = {
  dbId: string;
  workspaceId: string;
  defaultStatus: string;
};

const WORKSPACE_MAPPINGS: WorkspaceMapping[] = [
  {
    dbId: process.env.NOTION_KORUS_TASKS_DB ?? 'e98b3f42-2fba-4c5c-9f3c-45078e935c89',
    workspaceId: 'korus',
    defaultStatus: 'Lead',
  },
  {
    dbId: process.env.NOTION_BF_TASKS_DB ?? '40586981-fc6a-46d4-ac30-7f8ab7b50f5b',
    workspaceId: 'byron-film',
    defaultStatus: 'Backlog',
  },
  {
    dbId: process.env.NOTION_OC_TASKS_DB ?? '7412d365-b9e6-4ebf-8a07-055ff052e9fb',
    workspaceId: 'personal',
    defaultStatus: 'To Do',
  },
];

type NotionPropertyValue = {
  type: string;
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  select?: { name: string } | null;
  multi_select?: Array<{ name: string }>;
  date?: { start: string } | null;
  people?: Array<{ name?: string }>;
  checkbox?: boolean;
  number?: number | null;
};

function extractTitle(properties: Record<string, NotionPropertyValue>): string {
  for (const [, value] of Object.entries(properties)) {
    if (value.type === 'title' && value.title?.length) {
      return value.title.map((t) => t.plain_text).join('');
    }
  }
  return 'Untitled';
}

function extractText(prop: NotionPropertyValue | undefined): string | null {
  if (!prop) return null;
  if (prop.type === 'rich_text' && prop.rich_text?.length) {
    return prop.rich_text.map((t) => t.plain_text).join('');
  }
  return null;
}

function extractSelect(prop: NotionPropertyValue | undefined): string | null {
  if (!prop) return null;
  if (prop.type === 'select') return prop.select?.name ?? null;
  return null;
}

function extractMultiSelect(prop: NotionPropertyValue | undefined): string[] {
  if (!prop) return [];
  if (prop.type === 'multi_select') return prop.multi_select?.map((s) => s.name) ?? [];
  return [];
}

function extractDate(prop: NotionPropertyValue | undefined): Date | null {
  if (!prop || prop.type !== 'date' || !prop.date?.start) return null;
  const d = new Date(prop.date.start);
  return isNaN(d.getTime()) ? null : d;
}

function extractPerson(prop: NotionPropertyValue | undefined): string | null {
  if (!prop || prop.type !== 'people') return null;
  return prop.people?.[0]?.name ?? null;
}

async function syncDatabase(mapping: WorkspaceMapping): Promise<NotionSyncResult> {
  const result: NotionSyncResult = {
    synced: 0,
    created: 0,
    updated: 0,
    errors: [],
    workspace: mapping.workspaceId,
  };

  try {
    // Use dataSources API (SDK v5)
    // @ts-ignore — dataSources may not be typed in current version
    const pages = await notion.databases.query({
      database_id: mapping.dbId,
      page_size: 100,
    });

    for (const page of pages.results) {
      if (page.object !== 'page') continue;

      try {
        const props = (page as { properties: Record<string, NotionPropertyValue> }).properties;
        const title = extractTitle(props);
        const status = extractSelect(props['Status'] ?? props['status']) ?? mapping.defaultStatus;
        const priority = extractSelect(props['Priority'] ?? props['priority']);
        const dueDate = extractDate(props['Due Date'] ?? props['Due'] ?? props['due_date'] ?? props['due']);
        const assignee = extractPerson(props['Assignee'] ?? props['assignee']);
        const tags = extractMultiSelect(props['Tags'] ?? props['tags'] ?? props['Label'] ?? props['label']);
        const description = extractText(props['Description'] ?? props['description']);

        const existingTask = await db
          .select({ id: tasks.id })
          .from(tasks)
          .where(eq(tasks.notionId, page.id))
          .limit(1);

        if (existingTask.length > 0) {
          await db
            .update(tasks)
            .set({
              title,
              status,
              priority,
              dueDate,
              assignee,
              tags,
              description,
              notionLastSynced: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(tasks.notionId, page.id));

          result.updated++;
        } else {
          const [newTask] = await db
            .insert(tasks)
            .values({
              workspaceId: mapping.workspaceId,
              title,
              status,
              priority,
              dueDate,
              assignee,
              tags,
              description,
              notionId: page.id,
              notionLastSynced: new Date(),
            })
            .returning({ id: tasks.id });

          await logActivity({
            workspaceId: mapping.workspaceId,
            actor: 'system',
            action: 'synced',
            entityType: 'task',
            entityId: newTask.id,
            entityTitle: title,
            metadata: { notionId: page.id },
          });

          result.created++;
        }

        result.synced++;
      } catch (pageError) {
        result.errors.push(`Page ${page.id}: ${String(pageError)}`);
      }
    }
  } catch (error) {
    result.errors.push(`Database ${mapping.dbId}: ${String(error)}`);
  }

  return result;
}

export async function syncAllWorkspaces(): Promise<NotionSyncResult[]> {
  const results = await Promise.all(WORKSPACE_MAPPINGS.map(syncDatabase));
  return results;
}

export async function syncWorkspace(workspaceId: string): Promise<NotionSyncResult> {
  const mapping = WORKSPACE_MAPPINGS.find((m) => m.workspaceId === workspaceId);
  if (!mapping) {
    return { synced: 0, created: 0, updated: 0, errors: [`Unknown workspace: ${workspaceId}`], workspace: workspaceId };
  }
  return syncDatabase(mapping);
}
