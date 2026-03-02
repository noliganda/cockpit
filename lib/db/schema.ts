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
  assignee: text('assignee'),
  tags: text('tags').array().default([]),
  areaId: uuid('area_id'),
  projectId: uuid('project_id'),
  sprintId: uuid('sprint_id'),
  notionId: text('notion_id'),
  notionLastSynced: timestamp('notion_last_synced', { withTimezone: true }),
  region: text('region'),
  ...timestamps,
}, (t) => [
  index('tasks_workspace_idx').on(t.workspaceId),
  index('tasks_status_idx').on(t.status),
  index('tasks_notion_idx').on(t.notionId),
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
  embedding: vector('embedding'),
  embeddingModel: text('embedding_model'),
  searchVector: tsvector('search_vector'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('activity_workspace_idx').on(t.workspaceId),
  index('activity_created_idx').on(t.createdAt),
])

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
