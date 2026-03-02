export type WorkspaceId = 'byron-film' | 'korus' | 'personal'

export interface Workspace {
  id: WorkspaceId
  name: string
  slug: string
  color: string
  icon: string
}

export const WORKSPACES: Workspace[] = [
  { id: 'byron-film', name: 'Byron Film', slug: 'byron-film', color: '#D4A017', icon: '🎬' },
  { id: 'korus', name: 'KORUS Group', slug: 'korus', color: '#008080', icon: '🌏' },
  { id: 'personal', name: 'Personal', slug: 'personal', color: '#F97316', icon: '👤' },
]

export const WORKSPACE_STATUSES: Record<WorkspaceId, string[]> = {
  'byron-film': ['Backlog', 'Pre-Prod', 'In Prod', 'Post-Prod', 'Review', 'Delivered', 'Invoiced', 'Paid'],
  'korus': ['Lead', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'],
  'personal': ['To Do', 'In Progress', 'Completed'],
}

// Universal task statuses — used for all workspaces
export const TASK_STATUSES = ['Backlog', 'To Do', 'In Progress', 'Needs Review', 'Done', 'Cancelled'] as const
export type TaskStatus = typeof TASK_STATUSES[number]

export const PROJECT_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'] as const

export const PIPELINE_STAGES = ['Lead', 'Qualified', 'Proposal', 'Signature', 'Won', 'Lost', 'On Hold'] as const

export interface Task {
  id: string
  workspaceId: string
  title: string
  description?: string | null
  status: string
  priority?: string | null
  impact?: string | null
  effort?: string | null
  urgent?: boolean | null
  important?: boolean | null
  dueDate?: string | null
  assignee?: string | null
  tags?: string[] | null
  areaId?: string | null
  projectId?: string | null
  sprintId?: string | null
  notionId?: string | null
  notionLastSynced?: Date | null
  region?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  workspaceId: string
  name: string
  description?: string | null
  status?: string | null
  areaId?: string | null
  startDate?: string | null
  endDate?: string | null
  budget?: string | null
  region?: string | null
  projectManagerId?: string | null
  clientId?: string | null
  leadGenId?: string | null
  slackChannelId?: string | null
  slackChannelName?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Area {
  id: string
  workspaceId: string
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  status?: string | null
  order?: number | null
  context?: string | null
  spheresOfResponsibility?: string[] | null
  createdAt: Date
  updatedAt: Date
}

export interface Sprint {
  id: string
  workspaceId: string
  name: string
  goal?: string | null
  startDate?: string | null
  endDate?: string | null
  status?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Contact {
  id: string
  workspaceId: string
  name: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  company?: string | null
  organisationId?: string | null
  role?: string | null
  address?: string | null
  website?: string | null
  linkedinUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  portfolioUrl?: string | null
  notes?: string | null
  pipelineStage?: string | null
  nextReachDate?: string | null
  tags?: string[] | null
  source?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Organisation {
  id: string
  workspaceId: string
  name: string
  industry?: string | null
  website?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  pipelineStage?: string | null
  tags?: string[] | null
  size?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Note {
  id: string
  workspaceId: string
  title: string
  content?: unknown
  contentPlaintext?: string | null
  pinned?: boolean | null
  projectId?: string | null
  areaId?: string | null
  sprintId?: string | null
  tags?: string[] | null
  createdAt: Date
  updatedAt: Date
}

export interface ActivityLogEntry {
  id: string
  workspaceId: string
  actor: string
  action: string
  entityType: string
  entityId?: string | null
  entityTitle?: string | null
  description?: string | null
  metadata?: unknown
  embeddingModel?: string | null
  createdAt: Date
}

export interface Milestone {
  id: string
  projectId: string
  title: string
  date?: string | null
  status?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Bookmark {
  id: string
  projectId: string
  title: string
  url: string
  createdAt: Date
}

export interface ProjectContact {
  id: string
  projectId: string
  contactId: string
  role?: string | null
  createdAt: Date
  contact?: Contact
}

export interface BaseColumn {
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'url' | 'email' | 'person' | 'relation'
  options?: string[]
}

export interface Base {
  id: string
  workspaceId: string
  name: string
  description?: string | null
  schema: BaseColumn[]
  createdAt: Date
  updatedAt: Date
}

export interface BaseRow {
  id: string
  baseId: string
  data: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type PipelineStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
