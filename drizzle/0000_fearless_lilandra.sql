CREATE TABLE IF NOT EXISTS "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"outcome" text,
	"duration_minutes" real,
	"estimated_manual_minutes" real,
	"human_intervention" boolean DEFAULT false NOT NULL,
	"intervention_type" text,
	"api_cost_usd" real DEFAULT 0,
	"api_tokens_used" integer DEFAULT 0,
	"api_model" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"actor" text DEFAULT 'system' NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"entity_title" text,
	"description" text,
	"metadata" jsonb,
	"embedding" vector(1536),
	"embedding_model" text,
	"search_vector" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace" text DEFAULT 'all' NOT NULL,
	"period" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"tasks_completed" integer DEFAULT 0,
	"tasks_total" integer DEFAULT 0,
	"avg_task_duration_mins" numeric,
	"automation_rate" numeric,
	"api_cost_usd" numeric,
	"cost_per_task" numeric,
	"emails_sent" integer DEFAULT 0,
	"emails_received" integer DEFAULT 0,
	"avg_response_time_mins" numeric,
	"human_intervention_rate" numeric,
	"client_satisfaction" text,
	"security_incidents" integer DEFAULT 0,
	"notes" text,
	"reporting_phase" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"icon" text,
	"status" text DEFAULT 'active',
	"order" integer DEFAULT 0,
	"context" text,
	"spheres_of_responsibility" text[] DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "baselines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"workspace" text NOT NULL,
	"estimated_manual_minutes" real NOT NULL,
	"hourly_rate_usd" real DEFAULT 75 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "baselines_category_workspace_uniq" UNIQUE("category","workspace")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"mobile" text,
	"company" text,
	"organisation_id" uuid,
	"role" text,
	"address" text,
	"website" text,
	"linkedin_url" text,
	"instagram_url" text,
	"facebook_url" text,
	"portfolio_url" text,
	"notes" text,
	"pipeline_stage" text,
	"next_reach_date" date,
	"tags" text[] DEFAULT '{}',
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"workspace" text NOT NULL,
	"emails_sent" integer DEFAULT 0,
	"emails_received" integer DEFAULT 0,
	"avg_response_time_minutes" real,
	"autonomous_responses" integer DEFAULT 0,
	"escalated" integer DEFAULT 0,
	CONSTRAINT "email_stats_date_workspace_uniq" UNIQUE("date","workspace")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"date" date,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb,
	"content_plaintext" text,
	"pinned" boolean DEFAULT false,
	"project_id" uuid,
	"area_id" uuid,
	"sprint_id" uuid,
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"website" text,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"pipeline_stage" text,
	"tags" text[] DEFAULT '{}',
	"size" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"role" text DEFAULT 'Team',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'Planning',
	"area_id" uuid,
	"start_date" date,
	"end_date" date,
	"budget" numeric(12, 2),
	"region" text,
	"project_manager_id" uuid,
	"client_id" uuid,
	"lead_gen_id" uuid,
	"slack_channel_id" text,
	"slack_channel_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"start_date" date,
	"end_date" date,
	"status" text DEFAULT 'planning',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'Backlog' NOT NULL,
	"priority" text DEFAULT 'medium',
	"impact" text,
	"effort" text,
	"urgent" boolean DEFAULT false,
	"important" boolean DEFAULT false,
	"due_date" date,
	"assignee" text,
	"tags" text[] DEFAULT '{}',
	"area_id" uuid,
	"project_id" uuid,
	"sprint_id" uuid,
	"notion_id" text,
	"notion_last_synced" timestamp with time zone,
	"region" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_bases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"workspace" text DEFAULT 'personal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"name" text NOT NULL,
	"column_type" text DEFAULT 'text' NOT NULL,
	"options" jsonb,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'admin',
	"preferences" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text NOT NULL,
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_columns" ADD CONSTRAINT "user_columns_table_id_user_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."user_tables"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_rows" ADD CONSTRAINT "user_rows_table_id_user_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."user_tables"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_tables" ADD CONSTRAINT "user_tables_base_id_user_bases_id_fk" FOREIGN KEY ("base_id") REFERENCES "public"."user_bases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "actions_workspace_idx" ON "actions" USING btree ("workspace");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "actions_created_idx" ON "actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_workspace_idx" ON "activity_log" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_created_idx" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "areas_workspace_idx" ON "areas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookmarks_project_idx" ON "bookmarks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_workspace_idx" ON "contacts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "milestones_project_idx" ON "milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_workspace_idx" ON "notes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orgs_workspace_idx" ON "organisations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_contacts_project_idx" ON "project_contacts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_contacts_contact_idx" ON "project_contacts" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_workspace_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sprints_workspace_idx" ON "sprints" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_workspace_idx" ON "tasks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_notion_idx" ON "tasks" USING btree ("notion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_bases_workspace_idx" ON "user_bases" USING btree ("workspace");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_columns_table_idx" ON "user_columns" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_rows_table_idx" ON "user_rows" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_tables_base_idx" ON "user_tables" USING btree ("base_id");