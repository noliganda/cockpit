import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  serial,
  varchar,
  date,
} from 'drizzle-orm/pg-core';

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('admin'), // 'admin' | 'guest'
  displayName: varchar('display_name', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Guest Links ──────────────────────────────────────────────────────────────
export const guestLinks = pgTable('guest_links', {
  id: serial('id').primaryKey(),
  label: varchar('label', { length: 255 }).notNull(),
  pagePath: varchar('page_path', { length: 500 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
});

// ─── Workspaces ───────────────────────────────────────────────────────────────
export const workspaces = pgTable('workspaces', {
  id: varchar('id', { length: 100 }).primaryKey(), // 'byron-film' | 'korus' | 'private'
  name: varchar('name', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 10 }).notNull().default('🏢'),
  color: varchar('color', { length: 20 }).notNull().default('#e94560'),
  colorLight: varchar('color_light', { length: 20 }),
  colorDark: varchar('color_dark', { length: 20 }),
  description: text('description'),
  archived: boolean('archived').notNull().default(false),
  // Task sync provider (Phase 4): null = no sync, 'google_tasks' or 'microsoft_todo'
  syncProvider: varchar('sync_provider', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Areas ────────────────────────────────────────────────────────────────────
export const areas = pgTable('areas', {
  id: varchar('id', { length: 100 }).primaryKey(),
  workspaceId: varchar('workspace_id', { length: 100 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Custom Statuses ──────────────────────────────────────────────────────────
export const customStatuses = pgTable('custom_statuses', {
  id: varchar('id', { length: 100 }).primaryKey(),
  workspaceId: varchar('workspace_id', { length: 100 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 20 }).notNull().default('#6b7280'),
  order: integer('order').notNull().default(0),
  isDefault: boolean('is_default').notNull().default(false),
  isCompleted: boolean('is_completed').notNull().default(false),
  isCancelled: boolean('is_cancelled').notNull().default(false),
});

// ─── Custom Field Definitions ─────────────────────────────────────────────────
export const customFieldsDef = pgTable('custom_fields_def', {
  id: serial('id').primaryKey(),
  workspaceId: varchar('workspace_id', { length: 100 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  fieldType: varchar('field_type', { length: 50 }).notNull(), // text|number|date|select|multi_select|person|url|checkbox
  options: jsonb('options'), // for select/multi_select
  unit: varchar('unit', { length: 50 }), // for number (e.g. "$", "m²")
  order: integer('order').notNull().default(0),
});

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projects = pgTable('projects', {
  id: varchar('id', { length: 100 }).primaryKey(),
  workspaceId: varchar('workspace_id', { length: 100 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  areaId: varchar('area_id', { length: 100 }).references(() => areas.id),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active|paused|completed|archived
  priority: integer('priority').notNull().default(2),
  progress: integer('progress').notNull().default(0),
  color: varchar('color', { length: 20 }),
  deadline: date('deadline'),
  tags: jsonb('tags').notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Sprints ──────────────────────────────────────────────────────────────────
export const sprints = pgTable('sprints', {
  id: varchar('id', { length: 100 }).primaryKey(),
  workspaceId: varchar('workspace_id', { length: 100 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 500 }).notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: varchar('status', { length: 50 }).notNull().default('planned'), // planned|active|completed
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks = pgTable('tasks', {
  id: varchar('id', { length: 100 }).primaryKey(),
  workspaceId: varchar('workspace_id', { length: 100 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: varchar('project_id', { length: 100 }).references(() => projects.id),
  areaId: varchar('area_id', { length: 100 }).references(() => areas.id),
  sprintId: varchar('sprint_id', { length: 100 }).references(() => sprints.id),
  title: varchar('title', { length: 1000 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 100 }).notNull().default('todo'),
  assignee: varchar('assignee', { length: 100 }).default('Unassigned'),
  dueDate: date('due_date'),
  duration: integer('duration'), // minutes
  tags: jsonb('tags').notNull().default([]),
  urgent: boolean('urgent').notNull().default(false),
  important: boolean('important').notNull().default(false),
  effort: varchar('effort', { length: 20 }).notNull().default('Medium'), // Low|Medium|High
  impact: varchar('impact', { length: 20 }).notNull().default('Medium'), // Low|Medium|High
  customFields: jsonb('custom_fields').default({}),
  completedAt: timestamp('completed_at'),
  blockedReason: text('blocked_reason'),
  // Notion sync tracking — ONE-WAY pull from Notion
  notionId: varchar('notion_id', { length: 100 }).unique(),
  notionLastSynced: timestamp('notion_last_synced'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Organisations ────────────────────────────────────────────────────────────
export const organisations = pgTable('organisations', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 500 }).notNull(),
  website: varchar('website', { length: 500 }),
  industry: varchar('industry', { length: 255 }),
  address: text('address'),
  region: varchar('region', { length: 100 }),
  size: varchar('size', { length: 50 }), // Solo|SME|Enterprise
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Contacts ─────────────────────────────────────────────────────────────────
export const contacts = pgTable('contacts', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 500 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  linkedin: varchar('linkedin', { length: 500 }),
  organisationId: varchar('organisation_id', { length: 100 }).references(() => organisations.id),
  role: varchar('role', { length: 255 }),
  tags: jsonb('tags').notNull().default([]), // Client|Supplier|Freelancer|Lead|Personal
  source: varchar('source', { length: 100 }), // Website|Referral|Cold Outreach|LinkedIn|Apollo
  lastContacted: date('last_contacted'),
  notes: text('notes'),
  relationship: varchar('relationship', { length: 20 }).default('Warm'), // Hot|Warm|Cold
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Workspace ↔ Contacts (many-to-many) ─────────────────────────────────────
export const workspaceContacts = pgTable('workspace_contacts', {
  workspaceId: varchar('workspace_id', { length: 100 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  contactId: varchar('contact_id', { length: 100 })
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
});

// ─── Workspace ↔ Organisations (many-to-many) ────────────────────────────────
export const workspaceOrganisations = pgTable('workspace_organisations', {
  workspaceId: varchar('workspace_id', { length: 100 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  organisationId: varchar('organisation_id', { length: 100 })
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
});

// ─── Pipeline Stages ──────────────────────────────────────────────────────────
export const pipelineStages = pgTable('pipeline_stages', {
  id: varchar('id', { length: 100 }).primaryKey(),
  workspaceId: varchar('workspace_id', { length: 100 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  order: integer('order').notNull().default(0),
  color: varchar('color', { length: 20 }),
});

// ─── Pipeline Deals ───────────────────────────────────────────────────────────
export const pipelineDeals = pgTable('pipeline_deals', {
  id: varchar('id', { length: 100 }).primaryKey(),
  workspaceId: varchar('workspace_id', { length: 100 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  contactId: varchar('contact_id', { length: 100 }).references(() => contacts.id),
  organisationId: varchar('organisation_id', { length: 100 }).references(() => organisations.id),
  stageId: varchar('stage_id', { length: 100 }).references(() => pipelineStages.id),
  title: varchar('title', { length: 500 }).notNull(),
  value: integer('value'), // monetary value in cents
  currency: varchar('currency', { length: 10 }).default('AUD'),
  notes: text('notes'),
  probability: integer('probability'), // 0-100
  expectedCloseDate: date('expected_close_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── OAuth Connections ────────────────────────────────────────────────────────
export const oauthConnections = pgTable('oauth_connections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // 'google' | 'microsoft'
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  scope: text('scope'),
  providerEmail: varchar('provider_email', { length: 255 }), // email used for OAuth
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Notes ────────────────────────────────────────────────────────────────────
export const notes = pgTable('notes', {
  id: varchar('id', { length: 100 }).primaryKey(),
  // nullable = "Inbox" (unrouted note); set via #workspace-slug tag auto-routing
  workspaceId: varchar('workspace_id', { length: 100 })
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  // Optional relations — link note to a project, area, or sprint
  projectId: varchar('project_id', { length: 100 }).references(() => projects.id, { onDelete: 'set null' }),
  areaId: varchar('area_id', { length: 100 }).references(() => areas.id, { onDelete: 'set null' }),
  sprintId: varchar('sprint_id', { length: 100 }).references(() => sprints.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull().default(''),
  folder: varchar('folder', { length: 255 }), // optional folder grouping
  tags: jsonb('tags').notNull().default([]),
  pinned: boolean('pinned').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Project Documents (Phase 3b) ────────────────────────────────────────────
export const projectDocuments = pgTable('project_documents', {
  id: varchar('id', { length: 100 }).primaryKey(),
  projectId: varchar('project_id', { length: 100 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull(), // 'google' | 'microsoft'
  fileId: varchar('file_id', { length: 500 }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 200 }),
  webLink: varchar('web_link', { length: 2000 }).notNull(),
  linkedAt: timestamp('linked_at').notNull().defaultNow(),
});

// ─── Project Emails (Phase 3b) ────────────────────────────────────────────────
export const projectEmails = pgTable('project_emails', {
  id: varchar('id', { length: 100 }).primaryKey(),
  projectId: varchar('project_id', { length: 100 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: varchar('workspace_id', { length: 100 })
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  threadId: varchar('thread_id', { length: 500 }).notNull(),
  provider: varchar('provider', { length: 20 }).notNull().default('gmail'), // 'gmail' | 'outlook'
  subject: varchar('subject', { length: 1000 }),
  fromName: varchar('from_name', { length: 255 }),
  fromEmail: varchar('from_email', { length: 255 }),
  date: timestamp('date'),
  snippet: text('snippet'),
  webLink: varchar('web_link', { length: 2000 }),
  linkedAt: timestamp('linked_at').notNull().defaultNow(),
});

// ─── Project Contacts (Phase 3b) ──────────────────────────────────────────────
export const projectContacts = pgTable('project_contacts', {
  id: varchar('id', { length: 100 }).primaryKey(),
  projectId: varchar('project_id', { length: 100 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  contactId: varchar('contact_id', { length: 100 })
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 100 }).notNull().default('collaborator'), // client|contractor|collaborator|vendor|other
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Project Activity (Phase 3b) ──────────────────────────────────────────────
export const projectActivity = pgTable('project_activity', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id', { length: 100 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(), // 'task_created' | 'task_completed' | 'note_added' | 'email_linked' | 'file_linked' | 'contact_linked' | 'status_changed'
  entityType: varchar('entity_type', { length: 50 }), // 'task' | 'note' | 'email' | 'document' | 'contact' | 'project'
  entityId: varchar('entity_id', { length: 100 }),
  description: text('description').notNull(),
  userId: integer('user_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Workspace OAuth (Phase 4) ────────────────────────────────────────────────
// Per-workspace OAuth connections — each workspace can connect its own Google/Microsoft account
export const workspaceOauth = pgTable('workspace_oauth', {
  id: serial('id').primaryKey(),
  workspaceId: varchar('workspace_id', { length: 100 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // 'google' | 'microsoft'
  providerEmail: varchar('provider_email', { length: 255 }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  scopes: text('scopes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── External Sync (Phase 4 prep) ─────────────────────────────────────────────
// Tracks which tasks/projects have been pushed to Google Tasks or Microsoft To Do
export const externalSync = pgTable('external_sync', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 20 }).notNull(), // 'task' | 'project'
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'google_tasks' | 'microsoft_todo'
  externalId: varchar('external_id', { length: 500 }), // ID in the external system
  workspaceId: varchar('workspace_id', { length: 100 }).references(() => workspaces.id, { onDelete: 'cascade' }),
  lastSyncedAt: timestamp('last_synced_at'),
  syncStatus: varchar('sync_status', { length: 20 }).notNull().default('pending'), // 'pending' | 'synced' | 'error'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Daily Briefs (history) ───────────────────────────────────────────────────
// One row per calendar day — stores the generated morning brief for that day
export const briefs = pgTable('briefs', {
  id: serial('id').primaryKey(),
  date: varchar('date', { length: 10 }).notNull().unique(), // 'YYYY-MM-DD' in AEST
  content: jsonb('content').notNull(),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
});

// ─── Type exports (inferred) ──────────────────────────────────────────────────
export type Brief = typeof briefs.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type GuestLink = typeof guestLinks.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Area = typeof areas.$inferSelect;
export type CustomStatus = typeof customStatuses.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Sprint = typeof sprints.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Organisation = typeof organisations.$inferSelect;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type PipelineDeal = typeof pipelineDeals.$inferSelect;
export type OauthConnection = typeof oauthConnections.$inferSelect;
export type WorkspaceOauth = typeof workspaceOauth.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ExternalSync = typeof externalSync.$inferSelect;
export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type ProjectEmail = typeof projectEmails.$inferSelect;
export type ProjectContact = typeof projectContacts.$inferSelect;
export type ProjectActivity = typeof projectActivity.$inferSelect;
