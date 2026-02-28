// ALL TypeScript types for Ops Dashboard v3

export type WorkspaceId = 'byron-film' | 'korus' | 'personal';

export type Workspace = {
  id: string;
  name: string;
  slug: WorkspaceId;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskStatus =
  // Byron Film
  | 'Backlog' | 'Pre-Prod' | 'In Prod' | 'Post-Prod' | 'Review' | 'Delivered' | 'Invoiced' | 'Paid'
  // KORUS
  | 'Lead' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost' | 'On Hold'
  // Personal
  | 'To Do' | 'In Progress' | 'Completed'
  // Generic
  | 'todo' | 'in-progress' | 'done' | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type Task = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  impact: string | null;
  effort: string | null;
  urgent: boolean;
  important: boolean;
  dueDate: Date | null;
  assignee: string | null;
  tags: string[];
  areaId: string | null;
  projectId: string | null;
  sprintId: string | null;
  notionId: string | null;
  notionLastSynced: Date | null;
  region: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: string;
  areaId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  region: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Area = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Sprint = {
  id: string;
  workspaceId: string;
  name: string;
  goal: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Contact = {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  organisationId: string | null;
  role: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  pipelineStage: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type Organisation = {
  id: string;
  workspaceId: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  pipelineStage: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type Note = {
  id: string;
  workspaceId: string;
  title: string;
  content: string | null;
  pinned: boolean;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ActivityLog = {
  id: string;
  workspaceId: string;
  actor: 'system' | 'user' | 'charlie';
  action: 'created' | 'updated' | 'deleted' | 'synced' | 'exported';
  entityType: 'task' | 'project' | 'contact' | 'organisation' | 'note' | 'sprint' | 'area';
  entityId: string;
  entityTitle: string;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
};

export type ActivityLogParams = {
  workspaceId: string;
  actor: 'system' | 'user' | 'charlie';
  action: 'created' | 'updated' | 'deleted' | 'synced' | 'exported';
  entityType: 'task' | 'project' | 'contact' | 'organisation' | 'note' | 'sprint' | 'area';
  entityId: string;
  entityTitle: string;
  metadata?: Record<string, unknown>;
};

export type ApiResponse<T> = {
  data: T;
  error?: never;
} | {
  data?: never;
  error: string;
};

export type NotionSyncResult = {
  synced: number;
  created: number;
  updated: number;
  errors: string[];
  workspace: string;
};

export type WorkspaceConfig = {
  id: WorkspaceId;
  name: string;
  color: string;
  icon: string;
  statuses: string[];
};

export const BYRON_FILM_PIPELINE = ['Prospect', 'Outreach', 'Meeting', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
export const KORUS_PIPELINE = ['Lead', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];
export const PERSONAL_PIPELINE = ['Contact', 'Active', 'Inactive'];

export const PIPELINE_STAGES: Record<string, string[]> = {
  'byron-film': BYRON_FILM_PIPELINE,
  'korus': KORUS_PIPELINE,
  'personal': PERSONAL_PIPELINE,
};

export const WORKSPACES: WorkspaceConfig[] = [
  {
    id: 'byron-film',
    name: 'Byron Film',
    color: '#D4A017',
    icon: '🎬',
    statuses: ['Backlog', 'Pre-Prod', 'In Prod', 'Post-Prod', 'Review', 'Delivered', 'Invoiced', 'Paid'],
  },
  {
    id: 'korus',
    name: 'KORUS',
    color: '#008080',
    icon: '🌏',
    statuses: ['Lead', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'],
  },
  {
    id: 'personal',
    name: 'Personal',
    color: '#F97316',
    icon: '👤',
    statuses: ['To Do', 'In Progress', 'Completed'],
  },
];
