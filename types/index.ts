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

// ── Operator types ───────────────────────────────────────────────────────────

export type OperatorType = 'human' | 'agent'
export type OperatorStatus = 'active' | 'paused' | 'retired'
export type ExecutionMode = 'manual' | 'agent' | 'hybrid'
export type SourceType = 'slack' | 'email' | 'form' | 'manual' | 'api' | 'imported'
export type ObjectType = 'task' | 'project' | 'event' | 'document_request' | 'communication_action' | 'research_request'

export interface Operator {
  id: string
  name: string
  operatorType: OperatorType
  role?: string | null
  status: OperatorStatus
  defaultSupervisorId?: string | null
  workspaceScope?: string[] | null
  capabilities?: string[] | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

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

  // OPS v5 ownership
  assigneeType?: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  supervisorId?: string | null
  supervisorName?: string | null
  executionMode?: string | null

  // OPS v5 provenance
  sourceType?: string | null
  sourceChannel?: string | null
  sourceMessageId?: string | null
  sourceUrl?: string | null
  sourceCreatedAt?: Date | null

  // OPS v5 lifecycle
  objectType?: string | null
  blockedReason?: string | null
  startedAt?: Date | null
  completedAt?: Date | null
  lastActivityAt?: Date | null
  nextReviewAt?: Date | null

  // OPS v5 review
  reviewRequired?: boolean | null
  reviewedBy?: string | null
  reviewedAt?: Date | null
  completionSummary?: string | null

  // OPS v5 artifacts
  artifactUrl?: string | null
  artifactType?: string | null
  artifactStatus?: string | null

  // OPS v5 hierarchy
  parentTaskId?: string | null
  subtaskOrder?: number | null

  createdAt: Date
  updatedAt: Date
}

// ── Task Event types ─────────────────────────────────────────────────────────

export type TaskEventType =
  | 'task_created'
  | 'task_assigned'
  | 'task_started'
  | 'task_blocked'
  | 'task_unblocked'
  | 'task_submitted_for_review'
  | 'task_approved'
  | 'task_reopened'
  | 'task_completed'
  | 'task_cancelled'
  | 'task_updated'
  // Hierarchy events
  | 'subtask_created'
  | 'task_rollup_updated'
  | 'parent_at_risk'
  | 'parent_ready_for_review'

export interface TaskEvent {
  id: string
  taskId: string
  eventType: TaskEventType
  fromStatus?: string | null
  toStatus?: string | null
  actorType?: string | null
  actorId?: string | null
  actorName?: string | null
  summaryNote?: string | null
  blockedReason?: string | null
  artifactUrl?: string | null
  metadata?: unknown
  createdAt: Date
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
  entity?: string | null
  embeddingModel?: string | null

  // OPS v5 canonical event fields
  actorType?: string | null
  actorId?: string | null
  actorName?: string | null
  agentId?: string | null
  eventFamily?: string | null
  eventType?: string | null
  category?: string | null
  status?: string | null
  sourceSystem?: string | null
  sourceUrl?: string | null
  workflowRunId?: string | null
  requiresApproval?: boolean | null
  approvalStatus?: string | null
  approvedBy?: string | null
  durationMinutes?: number | null
  estimatedManualMinutes?: number | null
  humanIntervention?: boolean | null
  interventionType?: string | null
  apiCostUsd?: number | null
  apiTokensUsed?: number | null
  apiModel?: string | null
  artifactCount?: number | null
  artifactTypes?: string[] | null

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


export interface UserBase {
  id: string
  name: string
  description: string | null
  workspace: string
  areaId: string | null
  projectId: string | null
  shareToken: string | null
  isPublic: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

// ── Entity tagging (Phase 2B) ─────────────────────────────────────────────────

export type Entity = 'byron_film' | 'korus' | 'olivier_marcolin' | 'shared'

export const ENTITIES: { id: Entity; label: string; workspace: WorkspaceId }[] = [
  { id: 'byron_film', label: 'Byron Film', workspace: 'byron-film' },
  { id: 'korus', label: 'KORUS Group', workspace: 'korus' },
  { id: 'olivier_marcolin', label: 'Olivier Marcolin', workspace: 'personal' },
]

/** Map workspace slug → entity tag */
export function workspaceToEntity(ws: string): Entity {
  if (ws === 'byron-film') return 'byron_film'
  if (ws === 'korus') return 'korus'
  if (ws === 'personal') return 'olivier_marcolin'
  return 'shared'
}

/** Map entity tag → workspace slug */
export function entityToWorkspace(entity: string): WorkspaceId | null {
  if (entity === 'byron_film') return 'byron-film'
  if (entity === 'korus') return 'korus'
  if (entity === 'olivier_marcolin') return 'personal'
  return null
}

// ── Agent definitions (Phase 2B) ──────────────────────────────────────────────

export interface AgentDef {
  id: string
  name: string
  emoji: string
  color: string
  slackChannel?: string
  mission?: string
}

export const AGENTS: AgentDef[] = [
  { id: 'charlie', name: 'Charlie', emoji: '🐙', color: '#D4A017', slackChannel: '#om-charlie', mission: 'Chief of Staff — orchestration & comms' },
  { id: 'hunter', name: 'Hunter', emoji: '🎯', color: '#14B8A6', slackChannel: '#om-hunter', mission: 'Business Development — outreach & pipeline' },
  { id: 'finn', name: 'Finn', emoji: '💰', color: '#22C55E', slackChannel: '#om-finn', mission: 'Finance — invoicing, cost tracking, reporting' },
  { id: 'marcus', name: 'Marcus', emoji: '📝', color: '#F97316', slackChannel: '#om-marcus', mission: 'Content — social media, copy, briefs' },
  { id: 'devon', name: 'Devon', emoji: '🛠️', color: '#3B82F6', slackChannel: '#om-devon', mission: 'Engineering — code, infrastructure, dashboard' },
  { id: 'scout', name: 'Scout', emoji: '🔍', color: '#A855F7', slackChannel: '#om-scout', mission: 'Research — market intel, competitor analysis' },
]

// ── Agent Actions (Phase 2B) ──────────────────────────────────────────────────

export interface AgentAction {
  id: string
  agentId: string
  actionType: string
  entity: Entity
  description?: string | null
  metadata?: unknown
  costUsd?: string | null
  sourceUrl?: string | null
  createdAt: Date
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type PipelineStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

// ── Intake types ─────────────────────────────────────────────────────────────

export type IntakeObjectType = 'task' | 'project' | 'event' | 'document_request' | 'communication_action' | 'research_request'

export type IntakeEventType =
  | 'intake_received'
  | 'intake_classified'
  | 'intake_task_created'
  | 'intake_subtask_created'
  | 'intake_project_created'
  | 'intake_needs_review'

export interface IntakePayload {
  /** Source channel: slack, manual, email, form, api */
  sourceType: SourceType
  /** Raw text or summary of the request */
  rawText: string
  /** Workspace hint — slug like 'byron-film', 'korus', 'personal' */
  workspaceId?: string
  /** Explicit object type if caller already knows */
  objectTypeHint?: IntakeObjectType
  /** Explicit title if available (otherwise extracted from rawText) */
  title?: string
  /** Description beyond the title */
  description?: string
  /** Source channel name or ID */
  sourceChannel?: string
  /** Source message ID for traceability */
  sourceMessageId?: string
  /** Source URL for traceability */
  sourceUrl?: string
  /** Timestamp from the source system */
  sourceCreatedAt?: string
  /** Parent task ID — if set, create as subtask */
  parentTaskId?: string
  /** Priority hint */
  priority?: string
  /** Assignee hint */
  assigneeId?: string
  assigneeName?: string
  /** Actor performing the intake */
  actorType?: 'human' | 'agent' | 'system'
  actorId?: string
  actorName?: string
  /** Additional context */
  metadata?: Record<string, unknown>
}

export type IntakeConfidence = 'high' | 'medium' | 'low'

export interface IntakeClassification {
  objectType: IntakeObjectType
  confidence: IntakeConfidence
  title: string
  description?: string
  workspaceId: string
  /** Whether this should be created as a draft */
  isDraft: boolean
}

export interface IntakeResult {
  success: boolean
  objectType: IntakeObjectType
  objectId: string
  title: string
  confidence: IntakeConfidence
  isDraft: boolean
  parentTaskId?: string | null
  workspaceId: string
  intakeEventType: IntakeEventType
}
