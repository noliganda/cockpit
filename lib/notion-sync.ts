/**
 * Notion Task Sync — ONE-WAY PULL from Notion into the dashboard DB.
 * NEVER writes back to Notion.
 *
 * Env vars:
 *   NOTION_API_KEY         — Integration token (or NOTION_API_TOKEN as fallback)
 *   NOTION_KORUS_TASKS_DB  — KORUS tasks Notion DB ID
 *   NOTION_BF_TASKS_DB     — Byron Film tasks Notion DB ID
 *   NOTION_OC_TASKS_DB     — Oli & Charlie (private) tasks Notion DB ID
 */

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotionSyncTask {
  notionId: string;
  notionLastEditedTime: string;
  title: string;
  status: string;
  assignee: string;
  dueDate: string | null;
  description: string | null;
  urgent: boolean;
  important: boolean;
  effort: string;
  impact: string;
  tags: string[];
  workspaceId: string;
}

export interface WorkspaceSyncResult {
  workspaceId: string;
  dbId: string;
  created: number;
  updated: number;
  skipped: number;
  error: string | null;
}

export interface NotionSyncReport {
  workspaces: WorkspaceSyncResult[];
  totalCreated: number;
  totalUpdated: number;
  totalSkipped: number;
  errors: string[];
  syncedAt: string;
}

// ─── Workspace configs ────────────────────────────────────────────────────────

// Notion status name (lowercase) → dashboard status ID, per workspace
const STATUS_MAPS: Record<string, Record<string, string>> = {
  korus: {
    'to do': 'ko-todo',
    'todo': 'ko-todo',
    'not started': 'ko-todo',
    'in progress': 'ko-in-progress',
    'awaiting approval': 'ko-awaiting-approval',
    'on hold': 'ko-on-hold',
    'completed': 'ko-completed',
    'complete': 'ko-completed',
    'done': 'ko-completed',
    'cancelled': 'ko-todo',
    'canceled': 'ko-todo',
  },
  'byron-film': {
    'to do': 'bf-todo',
    'todo': 'bf-todo',
    'not started': 'bf-todo',
    'in progress': 'bf-in-progress',
    'in review': 'bf-in-review',
    'client feedback': 'bf-client-feedback',
    'revisions': 'bf-revisions',
    'completed': 'bf-completed',
    'complete': 'bf-completed',
    'done': 'bf-completed',
    'cancelled': 'bf-todo',
    'canceled': 'bf-todo',
  },
  private: {
    'to do': 'pr-todo',
    'todo': 'pr-todo',
    'not started': 'pr-todo',
    'in progress': 'pr-in-progress',
    'completed': 'pr-completed',
    'complete': 'pr-completed',
    'done': 'pr-completed',
    'cancelled': 'pr-todo',
    'canceled': 'pr-todo',
  },
};

const DEFAULT_STATUS: Record<string, string> = {
  korus: 'ko-todo',
  'byron-film': 'bf-todo',
  private: 'pr-todo',
};

interface WorkspaceConfig {
  workspaceId: string;
  dbId: string | null;
  /** Hint for the title property name — used to prioritise auto-detection */
  knownTitleProp?: string;
}

function getWorkspaceConfigs(): WorkspaceConfig[] {
  return [
    {
      workspaceId: 'korus',
      dbId: process.env.NOTION_KORUS_TASKS_DB || 'e98b3f42-2fba-4c5c-9f3c-45078e935c89',
      knownTitleProp: 'Tasks',
    },
    {
      workspaceId: 'byron-film',
      dbId: process.env.NOTION_BF_TASKS_DB || '40586981-fc6a-46d4-ac30-7f8ab7b50f5b',
      knownTitleProp: 'Task Name',
    },
    {
      workspaceId: 'private',
      dbId: process.env.NOTION_OC_TASKS_DB || '7412d365-b9e6-4ebf-8a07-055ff052e9fb',
      knownTitleProp: undefined,
    },
  ];
}

// ─── Notion API helpers ───────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.NOTION_API_KEY || process.env.NOTION_API_TOKEN;
  if (!key) throw new Error('NOTION_API_KEY not configured');
  return key;
}

async function notionFetch(endpoint: string, method = 'GET', body?: unknown): Promise<unknown> {
  const res = await fetch(`${NOTION_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

// ─── DB schema retrieval (auto-detect property names) ────────────────────────

interface PropDef {
  id: string;
  type: string;
  name: string;
}

interface DbPropertyMap {
  titleProp: string | null;      // property with type "title"
  statusProp: string | null;     // property with type "status" or "select" (status-like name)
  dueDateProp: string | null;    // property with type "date"
  assigneeProp: string | null;   // property with type "people"
  urgentProp: string | null;     // checkbox named urgent/urgent?
  importantProp: string | null;  // checkbox named important
  effortProp: string | null;     // select named effort
  impactProp: string | null;     // select named impact
  descriptionProp: string | null; // rich_text named description/notes
  tagsProp: string | null;       // multi_select named tags/labels
}

async function getDbPropertyMap(dbId: string, knownTitleProp?: string): Promise<DbPropertyMap> {
  const data = await notionFetch(`/databases/${dbId}`) as {
    properties: Record<string, PropDef>;
  };

  const props = data.properties;
  const map: DbPropertyMap = {
    titleProp: null,
    statusProp: null,
    dueDateProp: null,
    assigneeProp: null,
    urgentProp: null,
    importantProp: null,
    effortProp: null,
    impactProp: null,
    descriptionProp: null,
    tagsProp: null,
  };

  for (const [name, def] of Object.entries(props)) {
    const lname = name.toLowerCase();
    const type = def.type;

    if (type === 'title') {
      // Prefer known title prop name if provided
      if (!map.titleProp || name === knownTitleProp) map.titleProp = name;
    } else if (type === 'status') {
      if (!map.statusProp || lname === 'status') map.statusProp = name;
    } else if (type === 'select' && !map.statusProp && lname.includes('status')) {
      map.statusProp = name;
    } else if (type === 'date') {
      if (!map.dueDateProp || lname.includes('due')) map.dueDateProp = name;
    } else if (type === 'people') {
      if (!map.assigneeProp || lname.includes('assign')) map.assigneeProp = name;
    } else if (type === 'checkbox' && lname.includes('urgent')) {
      map.urgentProp = name;
    } else if (type === 'checkbox' && lname.includes('important')) {
      map.importantProp = name;
    } else if (type === 'select' && lname.includes('effort')) {
      map.effortProp = name;
    } else if (type === 'select' && lname.includes('impact')) {
      map.impactProp = name;
    } else if (type === 'rich_text' && (lname.includes('description') || lname.includes('notes') || lname.includes('detail'))) {
      if (!map.descriptionProp) map.descriptionProp = name;
    } else if (type === 'multi_select' && (lname.includes('tag') || lname.includes('label'))) {
      if (!map.tagsProp) map.tagsProp = name;
    }
  }

  return map;
}

// ─── Page parser ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTitle(prop: any): string {
  if (!prop) return '';
  const arr = prop.title || prop.rich_text || [];
  return Array.isArray(arr) ? arr.map((t: { plain_text: string }) => t.plain_text).join('').trim() : '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractStatus(prop: any): string {
  if (!prop) return '';
  // "status" type
  if (prop.status?.name) return prop.status.name;
  // "select" type
  if (prop.select?.name) return prop.select.name;
  return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDate(prop: any): string | null {
  return prop?.date?.start || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPeople(prop: any): Array<{ name: string }> {
  if (!prop || !Array.isArray(prop.people)) return [];
  return prop.people.map((p: { name: string }) => ({ name: p.name || '' }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCheckbox(prop: any): boolean {
  return !!prop?.checkbox;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSelect(prop: any): string {
  return prop?.select?.name || '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRichText(prop: any): string | null {
  if (!prop) return null;
  const arr = prop.rich_text || [];
  const text = Array.isArray(arr) ? arr.map((t: { plain_text: string }) => t.plain_text).join('').trim() : '';
  return text || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMultiSelect(prop: any): string[] {
  if (!prop || !Array.isArray(prop.multi_select)) return [];
  return prop.multi_select.map((s: { name: string }) => s.name);
}

function mapAssignee(people: Array<{ name: string }>): string {
  if (!people || people.length === 0) return 'Unassigned';
  const name = people[0].name.toLowerCase();
  if (name.includes('olivier') || name.includes('marcolin') || name.includes(' oli') || name === 'oli') return 'Oli';
  if (name.includes('charlie')) return 'Charlie';
  return 'Unassigned';
}

function mapStatus(workspaceId: string, notionStatus: string): string {
  if (!notionStatus) return DEFAULT_STATUS[workspaceId] || 'todo';
  const map = STATUS_MAPS[workspaceId] || {};
  const lower = notionStatus.toLowerCase().trim();
  return map[lower] || DEFAULT_STATUS[workspaceId] || 'todo';
}

function mapEffort(raw: string): 'Low' | 'Medium' | 'High' {
  const lower = raw.toLowerCase();
  if (lower.includes('low')) return 'Low';
  if (lower.includes('high')) return 'High';
  return 'Medium';
}

function mapImpact(raw: string): 'Low' | 'Medium' | 'High' {
  const lower = raw.toLowerCase();
  if (lower.includes('low')) return 'Low';
  if (lower.includes('high')) return 'High';
  return 'Medium';
}

// ─── Pagination query ─────────────────────────────────────────────────────────

interface NotionPage {
  id: string;
  last_edited_time: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
}

async function queryAllPages(dbId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const data = await notionFetch(`/databases/${dbId}/query`, 'POST', body) as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };

    pages.push(...(data.results || []));
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);

  return pages;
}

// ─── Main: pull tasks for one workspace ──────────────────────────────────────

export async function pullWorkspaceTasks(
  workspaceId: string,
  dbId: string,
  knownTitleProp?: string,
): Promise<NotionSyncTask[]> {
  // 1. Auto-detect property names from DB schema
  const propMap = await getDbPropertyMap(dbId, knownTitleProp);

  if (!propMap.titleProp) {
    throw new Error(`Could not find a title property in Notion DB ${dbId}`);
  }

  // 2. Query all pages (with pagination)
  const pages = await queryAllPages(dbId);

  // 3. Parse each page into a NotionSyncTask
  const tasks: NotionSyncTask[] = [];

  for (const page of pages) {
    const props = page.properties;

    const title = propMap.titleProp ? extractTitle(props[propMap.titleProp]) : '';
    if (!title) continue; // skip untitled tasks

    const notionStatus = propMap.statusProp ? extractStatus(props[propMap.statusProp]) : '';
    const people = propMap.assigneeProp ? extractPeople(props[propMap.assigneeProp]) : [];
    const dueDate = propMap.dueDateProp ? extractDate(props[propMap.dueDateProp]) : null;
    const urgent = propMap.urgentProp ? extractCheckbox(props[propMap.urgentProp]) : false;
    const important = propMap.importantProp ? extractCheckbox(props[propMap.importantProp]) : false;
    const effortRaw = propMap.effortProp ? extractSelect(props[propMap.effortProp]) : '';
    const impactRaw = propMap.impactProp ? extractSelect(props[propMap.impactProp]) : '';
    const description = propMap.descriptionProp ? extractRichText(props[propMap.descriptionProp]) : null;
    const tags = propMap.tagsProp ? extractMultiSelect(props[propMap.tagsProp]) : [];

    tasks.push({
      notionId: page.id,
      notionLastEditedTime: page.last_edited_time,
      title,
      status: mapStatus(workspaceId, notionStatus),
      assignee: mapAssignee(people),
      dueDate,
      description,
      urgent,
      important,
      effort: mapEffort(effortRaw),
      impact: mapImpact(impactRaw),
      tags,
      workspaceId,
    });
  }

  return tasks;
}

// ─── Pull all workspaces ──────────────────────────────────────────────────────

export async function pullAllWorkspaces(): Promise<{
  byWorkspace: Record<string, NotionSyncTask[]>;
  errors: Array<{ workspaceId: string; error: string }>;
}> {
  const configs = getWorkspaceConfigs();
  const byWorkspace: Record<string, NotionSyncTask[]> = {};
  const errors: Array<{ workspaceId: string; error: string }> = [];

  // Run each workspace sequentially to avoid rate limits
  for (const config of configs) {
    if (!config.dbId) {
      errors.push({ workspaceId: config.workspaceId, error: 'No DB ID configured' });
      continue;
    }

    try {
      const tasks = await pullWorkspaceTasks(config.workspaceId, config.dbId, config.knownTitleProp);
      byWorkspace[config.workspaceId] = tasks;
      console.log(`[notion-sync] ${config.workspaceId}: pulled ${tasks.length} tasks from DB ${config.dbId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ workspaceId: config.workspaceId, error: msg });
      console.error(`[notion-sync] ${config.workspaceId} failed:`, msg);
    }
  }

  return { byWorkspace, errors };
}

export function isNotionConfigured(): boolean {
  return !!(process.env.NOTION_API_KEY || process.env.NOTION_API_TOKEN);
}
