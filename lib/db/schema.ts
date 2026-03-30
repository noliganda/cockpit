import {
  pgTable, text, timestamp, boolean, jsonb, uuid, integer, numeric, date, real, index, customType, unique
} from 'drizzle-orm/pg-core'

// Custom vector type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    return value
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map(Number)
  },
})

// Custom tsvector type
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  color: text('color').notNull(),
  icon: text('icon'),
  ...timestamps,
})

// ── Operators (first-class human + agent registry) ──────────────────────────

export const operators = pgTable('operators', {
  id: text('id').primaryKey(), // stable slug: 'oli', 'charlie', 'devon', etc.
  name: text('name').notNull(),
  operatorType: text('operator_type').notNull().default('human'), // human | agent
  role: text('role'),
  status: text('status').notNull().default('active'), // active | paused | retired
  defaultSupervisorId: text('default_supervisor_id'),
  workspaceScope: text('workspace_scope').array().default([]), // which workspaces this operator covers
  capabilities: text('capabilities').array().default([]),
  notes: text('notes'),
  // Agent execution model fields
  budgetMonthlyCents: integer('budget_monthly_cents').notNull().default(0),
  spentMonthlyCents: integer('spent_monthly_cents').notNull().default(0),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  pauseReason: text('pause_reason'),
  ...timestamps,
})

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('Backlog'),
  priority: text('priority').default('medium'),
  impact: text('impact'),
  effort: text('effort'),
  urgent: boolean('urgent').default(false),
  important: boolean('important').default(false),
  dueDate: date('due_date'),
  assignee: text('assignee'), // kept for backward compat — prefer assigneeId
  tags: text('tags').array().default([]),
  areaId: uuid('area_id'),
  projectId: uuid('project_id'),
  sprintId: uuid('sprint_id'),
  notionId: text('notion_id'),
  notionLastSynced: timestamp('notion_last_synced', { withTimezone: true }),
  region: text('region'),

  // ── OPS v5 ownership fields ───────────────────────────────────────────────
  assigneeType: text('assignee_type'), // human | agent
  assigneeId: text('assignee_id'), // FK to operators.id
  assigneeName: text('assignee_name'), // denormalized display name
  supervisorId: text('supervisor_id'), // FK to operators.id
  supervisorName: text('supervisor_name'),
  executionMode: text('execution_mode'), // manual | agent | hybrid

  // ── OPS v5 provenance fields ──────────────────────────────────────────────
  sourceType: text('source_type'), // slack | email | form | manual | api | imported
  sourceChannel: text('source_channel'),
  sourceMessageId: text('source_message_id'),
  sourceUrl: text('source_url'),
  sourceCreatedAt: timestamp('source_created_at', { withTimezone: true }),

  // ── OPS v5 lifecycle fields ───────────────────────────────────────────────
  objectType: text('object_type'), // task | project | event | document_request | communication_action | research_request
  blockedReason: text('blocked_reason'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  nextReviewAt: timestamp('next_review_at', { withTimezone: true }),

  // ── OPS v5 review fields ──────────────────────────────────────────────────
  reviewRequired: boolean('review_required').default(false),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  completionSummary: text('completion_summary'),

  // ── OPS v5 artifact fields ────────────────────────────────────────────────
  artifactUrl: text('artifact_url'),
  artifactType: text('artifact_type'),
  artifactStatus: text('artifact_status'),

  // ── OPS v5 hierarchy fields ─────────────────────────────────────────────
  parentTaskId: uuid('parent_task_id'), // FK to tasks.id — null = top-level parent
  subtaskOrder: integer('subtask_order').default(0), // ordering among siblings

  ...timestamps,
}, (t) => [
  index('tasks_workspace_idx').on(t.workspaceId),
  index('tasks_status_idx').on(t.status),
  index('tasks_notion_idx').on(t.notionId),
  index('tasks_assignee_id_idx').on(t.assigneeId),
  index('tasks_object_type_idx').on(t.objectType),
  index('tasks_parent_task_id_idx').on(t.parentTaskId),
])

// ── Task Events (structured lifecycle audit trail) ──────────────────────────

export const taskEvents = pgTable('task_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').notNull(),
  eventType: text('event_type').notNull(), // task_created | task_assigned | task_started | task_blocked | etc.
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  actorType: text('actor_type'), // human | agent | system
  actorId: text('actor_id'),
  actorName: text('actor_name'),
  summaryNote: text('summary_note'),
  blockedReason: text('blocked_reason'),
  artifactUrl: text('artifact_url'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('task_events_task_idx').on(t.taskId),
  index('task_events_type_idx').on(t.eventType),
  index('task_events_created_idx').on(t.createdAt),
])

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('Planning'),
  areaId: uuid('area_id'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  budget: numeric('budget', { precision: 12, scale: 2 }),
  region: text('region'),
  projectManagerId: uuid('project_manager_id'),
  clientId: uuid('client_id'),
  leadGenId: uuid('lead_gen_id'),
  slackChannelId: text('slack_channel_id'),
  slackChannelName: text('slack_channel_name'),
  starred: boolean('starred').default(false),
  ...timestamps,
}, (t) => [
  index('projects_workspace_idx').on(t.workspaceId),
])

export const areas = pgTable('areas', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  icon: text('icon'),
  status: text('status').default('active'),
  order: integer('order').default(0),
  context: text('context'),
  spheresOfResponsibility: text('spheres_of_responsibility').array().default([]),
  ...timestamps,
}, (t) => [
  index('areas_workspace_idx').on(t.workspaceId),
])

export const sprints = pgTable('sprints', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  goal: text('goal'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: text('status').default('planning'),
  ...timestamps,
}, (t) => [
  index('sprints_workspace_idx').on(t.workspaceId),
])

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  phone: text('phone'),
  mobile: text('mobile'),
  company: text('company'),
  organisationId: uuid('organisation_id'),
  role: text('role'),
  address: text('address'),
  website: text('website'),
  linkedinUrl: text('linkedin_url'),
  instagramUrl: text('instagram_url'),
  facebookUrl: text('facebook_url'),
  portfolioUrl: text('portfolio_url'),
  notes: text('notes'),
  pipelineStage: text('pipeline_stage'),
  nextReachDate: date('next_reach_date'),
  tags: text('tags').array().default([]),
  source: text('source'),
  ...timestamps,
}, (t) => [
  index('contacts_workspace_idx').on(t.workspaceId),
])

export const organisations = pgTable('organisations', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  industry: text('industry'),
  website: text('website'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  notes: text('notes'),
  pipelineStage: text('pipeline_stage'),
  tags: text('tags').array().default([]),
  size: text('size'),
  ...timestamps,
}, (t) => [
  index('orgs_workspace_idx').on(t.workspaceId),
])

export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  title: text('title').notNull(),
  content: jsonb('content'),
  contentPlaintext: text('content_plaintext'),
  pinned: boolean('pinned').default(false),
  projectId: uuid('project_id'),
  areaId: uuid('area_id'),
  sprintId: uuid('sprint_id'),
  tags: text('tags').array().default([]),
  ...timestamps,
}, (t) => [
  index('notes_workspace_idx').on(t.workspaceId),
])

export const activityLog = pgTable('activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  actor: text('actor').notNull().default('system'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  entityTitle: text('entity_title'),
  description: text('description'),
  metadata: jsonb('metadata'),
  entity: text('entity').default('shared'), // byron_film | korus | olivier_marcolin | shared
  embedding: vector('embedding'),
  embeddingModel: text('embedding_model'),
  searchVector: tsvector('search_vector'),

  // ── OPS v5 canonical event fields ─────────────────────────────────────────

  // Actor
  actorType: text('actor_type').notNull().default('human'),
  actorId: text('actor_id'),
  actorName: text('actor_name'),
  agentId: text('agent_id'),

  // Event typing
  eventFamily: text('event_family').notNull().default('system'),
  eventType: text('event_type'),
  category: text('category'),
  status: text('status').notNull().default('success'),

  // Source / provenance
  sourceSystem: text('source_system').notNull().default('dashboard'),
  sourceUrl: text('source_url'),
  workflowRunId: text('workflow_run_id'),

  // Approval / governance
  requiresApproval: boolean('requires_approval').default(false),
  approvalStatus: text('approval_status').notNull().default('not_required'),
  approvedBy: text('approved_by'),

  // Productivity
  durationMinutes: real('duration_minutes'),
  estimatedManualMinutes: real('estimated_manual_minutes'),
  humanIntervention: boolean('human_intervention').default(false),
  interventionType: text('intervention_type'),
  apiCostUsd: real('api_cost_usd').default(0),
  apiTokensUsed: integer('api_tokens_used').default(0),
  apiModel: text('api_model'),

  // Artifacts
  artifactCount: integer('artifact_count').default(0),
  artifactTypes: text('artifact_types').array().default([]),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  // Existing indexes
  index('activity_workspace_idx').on(t.workspaceId),
  index('activity_created_idx').on(t.createdAt),
  index('activity_entity_idx').on(t.entity),
  // OPS v5 indexes
  index('activity_actor_type_idx').on(t.actorType),
  index('activity_agent_id_idx').on(t.agentId),
  index('activity_event_family_idx').on(t.eventFamily),
  index('activity_event_type_idx').on(t.eventType),
  index('activity_category_idx').on(t.category),
  index('activity_status_idx').on(t.status),
  index('activity_source_system_idx').on(t.sourceSystem),
  index('activity_approval_status_idx').on(t.approvalStatus),
])

// ── Agent Actions (every agent action logged here — Phase 2B) ─────────────────

export const agentActions = pgTable('agent_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: text('agent_id').notNull(), // 'charlie', 'hunter', 'finn', 'marcus', 'devon', 'scout'
  actionType: text('action_type').notNull(), // 'email_sent', 'invoice_created', 'task_updated', etc.
  entity: text('entity').notNull().default('shared'), // 'byron_film' | 'korus' | 'olivier_marcolin' | 'shared'
  description: text('description'),
  metadata: jsonb('metadata'), // flexible payload (source URL, slack thread, etc.)
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }), // token cost if applicable
  sourceUrl: text('source_url'), // link to Slack message, email, Notion task, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('agent_actions_agent_idx').on(t.agentId),
  index('agent_actions_entity_idx').on(t.entity),
  index('agent_actions_created_idx').on(t.createdAt),
  index('agent_actions_type_idx').on(t.actionType),
])

// ── Agent Task Sessions (prevent double assignment of tasks) ───────────────
export const agentTaskSessions = pgTable('agent_task_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  operatorId: text('operator_id').notNull(),
  taskId: uuid('task_id').notNull(),
  sessionDisplayId: text('session_display_id'),
  adapterType: text('adapter_type').notNull(),
  status: text('status').notNull().default('active'),
  lastCheckpointAt: timestamp('last_checkpoint_at', { withTimezone: true }).defaultNow().notNull(),
  lastError: text('last_error'),
  metadata: jsonb('metadata').notNull().default({}),
  /** Snapshot of full task context at session creation */
  contextSnapshot: jsonb('context_snapshot'),
  ...timestamps,
}, (t) => [
  unique('agent_task_sessions_operator_task_uniq').on(t.operatorId, t.taskId),
])


// ── Budget Policies (limits and warnings per scope) ──────────────────────
export const budgetPolicies = pgTable('budget_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  scopeType: text('scope_type').notNull(),
  scopeId: text('scope_id').notNull(),
  windowKind: text('window_kind').notNull().default('monthly'),
  amountCents: integer('amount_cents').notNull().default(0),
  warnPercent: integer('warn_percent').notNull().default(80),
  hardStopEnabled: boolean('hard_stop_enabled').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
})

// ── Log Share Tokens (workspace-scoped guest access to /logs) ─────────────────

export const logShareTokens = pgTable('log_share_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  entity: text('entity').notNull(), // scoped to one entity
  label: text('label'), // e.g. "Bruno — KORUS View"
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('admin'),
  preferences: jsonb('preferences'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})


export const milestones = pgTable('milestones', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  title: text('title').notNull(),
  date: date('date'),
  status: text('status').default('pending'),
  ...timestamps,
}, (t) => [
  index('milestones_project_idx').on(t.projectId),
])

export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('bookmarks_project_idx').on(t.projectId),
])

export const projectContacts = pgTable('project_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  contactId: uuid('contact_id').notNull(),
  role: text('role').default('Team'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('project_contacts_project_idx').on(t.projectId),
  index('project_contacts_contact_idx').on(t.contactId),
])

export const aiMetrics = pgTable('ai_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspace: text('workspace').notNull().default('all'),
  period: text('period').notNull(), // 'daily' | 'weekly' | 'monthly'
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  tasksCompleted: integer('tasks_completed').default(0),
  tasksTotal: integer('tasks_total').default(0),
  avgTaskDurationMins: numeric('avg_task_duration_mins'),
  automationRate: numeric('automation_rate'), // 0-100 percentage
  apiCostUsd: numeric('api_cost_usd'),
  costPerTask: numeric('cost_per_task'),
  emailsSent: integer('emails_sent').default(0),
  emailsReceived: integer('emails_received').default(0),
  avgResponseTimeMins: numeric('avg_response_time_mins'),
  humanInterventionRate: numeric('human_intervention_rate'), // 0-100 %
  clientSatisfaction: text('client_satisfaction'), // 'positive' | 'neutral' | 'negative' | null
  securityIncidents: integer('security_incidents').default(0),
  notes: text('notes'),
  reportingPhase: text('reporting_phase'), // 'daily' | 'weekly' | 'copil'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const actions = pgTable('actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  workspace: text('workspace').notNull(), // 'korus' | 'byron-film' | 'personal'
  category: text('category').notNull(), // 'email' | 'research' | 'admin' | etc.
  description: text('description').notNull(),
  outcome: text('outcome'),
  durationMinutes: real('duration_minutes'),
  estimatedManualMinutes: real('estimated_manual_minutes'),
  humanIntervention: boolean('human_intervention').notNull().default(false),
  interventionType: text('intervention_type'), // 'tone' | 'content' | 'timing' | 'recipient' | 'other'
  apiCostUsd: real('api_cost_usd').default(0),
  apiTokensUsed: integer('api_tokens_used').default(0),
  apiModel: text('api_model'),
  metadata: jsonb('metadata'),
}, (t) => [
  index('actions_workspace_idx').on(t.workspace),
  index('actions_created_idx').on(t.createdAt),
])

export const baselines = pgTable('baselines', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: text('category').notNull(),
  workspace: text('workspace').notNull(),
  estimatedManualMinutes: real('estimated_manual_minutes').notNull(),
  hourlyRateUsd: real('hourly_rate_usd').notNull().default(75),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('baselines_category_workspace_uniq').on(t.category, t.workspace),
])

export const emailStats = pgTable('email_stats', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: date('date').notNull(),
  workspace: text('workspace').notNull(),
  emailsSent: integer('emails_sent').default(0),
  emailsReceived: integer('emails_received').default(0),
  avgResponseTimeMinutes: real('avg_response_time_minutes'),
  autonomousResponses: integer('autonomous_responses').default(0),
  escalated: integer('escalated').default(0),
}, (t) => [
  unique('email_stats_date_workspace_uniq').on(t.date, t.workspace),
])

// ── Calendar Events (synced from Google Calendar) ────────────────────────────

export const calendarEvents = pgTable('calendar_events', {
  id: text('id').primaryKey(), // Google Calendar event ID
  workspaceId: text('workspace_id').notNull(),
  calendarId: text('calendar_id').notNull(), // e.g. olivier@byronfilm.com
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  allDay: boolean('all_day').default(false),
  url: text('url'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('calendar_events_workspace_idx').on(t.workspaceId),
  index('calendar_events_start_idx').on(t.startTime),
])

// ── Tables / Bases (native spreadsheet feature) ──────────────────────────────

export const userBases = pgTable('user_bases', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  workspace: text('workspace_id').notNull().default('personal'), // 'byron_film' | 'korus' | 'personal'
  areaId: uuid('area_id').references(() => areas.id, { onDelete: 'set null' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  shareToken: text('share_token').unique(),
  isPublic: boolean('is_public').default(false).notNull(),
  ...timestamps,
}, (t) => [
  index('user_bases_workspace_idx').on(t.workspace),
  index('user_bases_area_idx').on(t.areaId),
  index('user_bases_project_idx').on(t.projectId),
])

export const userTables = pgTable('user_tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  baseId: uuid('base_id').notNull().references(() => userBases.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  ...timestamps,
}, (t) => [
  index('user_tables_base_idx').on(t.baseId),
])

export const userColumns = pgTable('user_columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableId: uuid('table_id').notNull().references(() => userTables.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  columnType: text('column_type').notNull().default('text'), // text | number | date | boolean | select | url | email
  options: jsonb('options'), // for select: { choices: ["A","B","C"] }
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('user_columns_table_idx').on(t.tableId),
])

export const userRows = pgTable('user_rows', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableId: uuid('table_id').notNull().references(() => userTables.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull().default({}), // keys = column IDs, values = cell data
  ...timestamps,
}, (t) => [
  index('user_rows_table_idx').on(t.tableId),
])
// ── Agent Wakeup Requests (task assignment triggers for agent execution) ─────
export const agentWakeupRequests = pgTable('agent_wakeup_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  operatorId: text('operator_id').notNull().references(() => operators.id),
  taskId: uuid('task_id').references(() => tasks.id),
  source: text('source').notNull(), // 'task_assigned' | 'heartbeat' | 'manual' | 'slack'
  triggerDetail: text('trigger_detail'),
  reason: text('reason'),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('queued'), // queued | claimed | running | completed | failed | cancelled
  coalescedCount: integer('coalesced_count').notNull().default(0),
  idempotencyKey: text('idempotency_key'),
  requestedByActorType: text('requested_by_actor_type'), // 'human' | 'agent' | 'system'
  requestedByActorId: text('requested_by_actor_id'),
  runId: uuid('run_id').references(() => agentTaskSessions.id),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  error: text('error'),
  ...timestamps,
}, (t) => [
  index('agent_wakeup_requests_operator_status_idx').on(t.operatorId, t.status),
  index('agent_wakeup_requests_task_status_idx').on(t.taskId, t.status),
])
