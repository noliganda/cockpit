import {
  pgTable,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
};

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  ...timestamps,
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'),
  priority: text('priority'),
  impact: text('impact'),
  effort: text('effort'),
  urgent: boolean('urgent').default(false).notNull(),
  important: boolean('important').default(false).notNull(),
  dueDate: timestamp('due_date'),
  assignee: text('assignee'),
  tags: text('tags').array().default([]).notNull(),
  areaId: uuid('area_id'),
  projectId: uuid('project_id'),
  sprintId: uuid('sprint_id'),
  notionId: text('notion_id'),
  notionLastSynced: timestamp('notion_last_synced'),
  region: text('region'),
  ...timestamps,
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  areaId: uuid('area_id'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  budget: numeric('budget'),
  region: text('region'),
  ...timestamps,
});

export const areas = pgTable('areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  order: integer('order').default(0).notNull(),
  ...timestamps,
});

export const sprints = pgTable('sprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  goal: text('goal'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  status: text('status').notNull().default('planning'),
  ...timestamps,
});

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  organisationId: uuid('organisation_id'),
  role: text('role'),
  address: text('address'),
  website: text('website'),
  notes: text('notes'),
  pipelineStage: text('pipeline_stage'),
  tags: text('tags').array().default([]).notNull(),
  ...timestamps,
});

export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  industry: text('industry'),
  website: text('website'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  notes: text('notes'),
  pipelineStage: text('pipeline_stage'),
  tags: text('tags').array().default([]).notNull(),
  ...timestamps,
});

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  title: text('title').notNull(),
  content: text('content'),
  pinned: boolean('pinned').default(false).notNull(),
  projectId: uuid('project_id'),
  ...timestamps,
});

export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  entityTitle: text('entity_title').notNull(),
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export type DbWorkspace = typeof workspaces.$inferSelect;
export type DbTask = typeof tasks.$inferSelect;
export type DbProject = typeof projects.$inferSelect;
export type DbArea = typeof areas.$inferSelect;
export type DbSprint = typeof sprints.$inferSelect;
export type DbContact = typeof contacts.$inferSelect;
export type DbOrganisation = typeof organisations.$inferSelect;
export type DbNote = typeof notes.$inferSelect;
export type DbActivityLog = typeof activityLog.$inferSelect;
