-- OPS v5 Phase 3: Backfill legacy data into canonical activity_log
--
-- This migration copies rows from agent_actions and actions into activity_log
-- with full provenance tracking. It is idempotent: re-running will skip
-- already-migrated rows (keyed on source_system + metadata._source_id).
--
-- IMPORTANT: Review before running against production.
-- No rows are deleted from source tables.
--
-- Expected row counts (at time of writing):
--   agent_actions: 16 rows → 16 new activity_log rows
--   actions:       85 rows → 85 new activity_log rows
--
-- Heuristic assumptions documented inline with [HEURISTIC] comments.
-- Fields left null where inference is unreliable are marked [NULL-BY-DESIGN].

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. BACKFILL FROM agent_actions
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Mapping confidence:
--   CONFIDENT: agent_id → actor_id/agent_id/actor, action_type → event_type/action,
--              entity → entity, description, metadata, cost_usd → api_cost_usd,
--              source_url, created_at, actor_type='agent', status='success'
--   HEURISTIC: event_family (inferred from action_type prefix)
--              workspace_id (derived from entity tag)
--   NULL-BY-DESIGN: actor_name, category, entity_title, duration/intervention/artifact fields

INSERT INTO activity_log (
  workspace_id,
  actor,
  action,
  entity_type,
  entity_id,
  entity_title,
  description,
  metadata,
  entity,
  actor_type,
  actor_id,
  agent_id,
  event_family,
  event_type,
  status,
  source_system,
  source_url,
  api_cost_usd,
  created_at
)
SELECT
  -- workspace_id: derived from entity tag → workspace slug
  CASE aa.entity
    WHEN 'byron_film'       THEN 'byron-film'
    WHEN 'korus'            THEN 'korus'
    WHEN 'olivier_marcolin' THEN 'personal'
    ELSE 'personal'  -- fallback for 'shared' or unknown
  END,

  -- actor: legacy field, use agent_id directly
  aa.agent_id,

  -- action: legacy required NOT NULL field, maps directly from action_type
  aa.action_type,

  -- entity_type: these are agent action records
  'agent_action',

  -- entity_id: preserve original row ID for traceability
  aa.id::text,

  -- entity_title: [NULL-BY-DESIGN] agent_actions has no title field
  NULL,

  -- description
  aa.description,

  -- metadata: original metadata merged with migration provenance
  jsonb_build_object(
    '_source_table', 'agent_actions',
    '_source_id', aa.id::text,
    '_migrated_at', now()::text
  ) || COALESCE(aa.metadata, '{}'::jsonb),

  -- entity: direct mapping
  aa.entity,

  -- actor_type: confident — these are all agent actions
  'agent',

  -- actor_id: agent_id is the actor
  aa.agent_id,

  -- agent_id: direct mapping
  aa.agent_id,

  -- event_family: [HEURISTIC] inferred from action_type prefix
  CASE
    WHEN aa.action_type LIKE 'email%'                                            THEN 'email'
    WHEN aa.action_type LIKE 'invoice%' OR aa.action_type LIKE 'expense%'        THEN 'finance'
    WHEN aa.action_type LIKE 'proposal%' OR aa.action_type LIKE 'lead%'
         OR aa.action_type LIKE 'outreach%'                                      THEN 'crm'
    WHEN aa.action_type LIKE 'content%' OR aa.action_type LIKE 'marketing%'      THEN 'marketing'
    WHEN aa.action_type LIKE 'code%' OR aa.action_type LIKE 'deploy%'
         OR aa.action_type LIKE 'system%'                                        THEN 'deployment'
    WHEN aa.action_type LIKE 'research%'                                         THEN 'research'
    WHEN aa.action_type LIKE 'task%' OR aa.action_type LIKE 'sprint%'            THEN 'task'
    WHEN aa.action_type LIKE 'morning%'                                          THEN 'system'
    ELSE 'agent'  -- safe fallback for unrecognised action types
  END,

  -- event_type: direct mapping from action_type (confident)
  aa.action_type,

  -- status: all existing rows are completed actions
  'success',

  -- source_system: provenance marker for migration
  'migration_agent_actions',

  -- source_url: direct mapping
  aa.source_url,

  -- api_cost_usd: cast from numeric to real
  aa.cost_usd::real,

  -- created_at: preserve original timestamp
  aa.created_at

FROM agent_actions aa
WHERE NOT EXISTS (
  SELECT 1
  FROM activity_log al
  WHERE al.source_system = 'migration_agent_actions'
    AND al.metadata->>'_source_id' = aa.id::text
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. BACKFILL FROM actions (productivity reporting table)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Mapping confidence:
--   CONFIDENT: workspace → workspace_id, category, description,
--              duration_minutes, estimated_manual_minutes, human_intervention,
--              intervention_type, api_cost_usd, api_tokens_used, api_model,
--              metadata, created_at, source_system='migration_actions'
--   HEURISTIC: event_family (inferred from category),
--              entity (derived from workspace slug)
--   NULL-BY-DESIGN: actor_type (defaults to 'human' — original table has no actor),
--                   event_type (no specific action verb available),
--                   actor_id, actor_name, agent_id, source_url,
--                   approval fields, artifact fields
--   PRESERVED IN METADATA: outcome (original actions.outcome field)

INSERT INTO activity_log (
  workspace_id,
  actor,
  action,
  entity_type,
  entity_id,
  description,
  metadata,
  entity,
  event_family,
  category,
  status,
  source_system,
  duration_minutes,
  estimated_manual_minutes,
  human_intervention,
  intervention_type,
  api_cost_usd,
  api_tokens_used,
  api_model,
  created_at
)
SELECT
  -- workspace_id: direct mapping (already uses slug format)
  a.workspace,

  -- actor: legacy required NOT NULL field; no actor info in source table
  'system',

  -- action: legacy required NOT NULL field; generic label for reported events
  'reported_action',

  -- entity_type: these are productivity reporting events
  'action',

  -- entity_id: preserve original row ID for traceability
  a.id::text,

  -- description: direct mapping
  a.description,

  -- metadata: original metadata + provenance + outcome preservation
  jsonb_build_object(
    '_source_table', 'actions',
    '_source_id', a.id::text,
    '_migrated_at', now()::text
  )
  || CASE
       WHEN a.outcome IS NOT NULL
       THEN jsonb_build_object('outcome', a.outcome)
       ELSE '{}'::jsonb
     END
  || COALESCE(a.metadata, '{}'::jsonb),

  -- entity: [HEURISTIC] derived from workspace slug → entity tag
  CASE a.workspace
    WHEN 'byron-film' THEN 'byron_film'
    WHEN 'korus'      THEN 'korus'
    WHEN 'personal'   THEN 'olivier_marcolin'
    ELSE 'shared'
  END,

  -- event_family: [HEURISTIC] inferred from category
  CASE a.category
    WHEN 'email'          THEN 'email'
    WHEN 'research'       THEN 'research'
    WHEN 'admin'          THEN 'system'
    WHEN 'development'    THEN 'deployment'
    WHEN 'coordination'   THEN 'workflow'
    WHEN 'finance'        THEN 'finance'
    WHEN 'marketing'      THEN 'marketing'
    WHEN 'sales'          THEN 'crm'
    WHEN 'operations'     THEN 'workflow'
    WHEN 'recruitment'    THEN 'crm'
    WHEN 'legal'          THEN 'system'
    WHEN 'creative'       THEN 'marketing'
    WHEN 'support'        THEN 'system'
    WHEN 'infrastructure' THEN 'deployment'
    ELSE 'system'  -- safe fallback
  END,

  -- category: direct mapping (confident — native field)
  a.category,

  -- status: all existing rows are completed reported actions
  'success',

  -- source_system: provenance marker for migration
  'migration_actions',

  -- duration_minutes: direct mapping
  a.duration_minutes,

  -- estimated_manual_minutes: direct mapping
  a.estimated_manual_minutes,

  -- human_intervention: direct mapping
  a.human_intervention,

  -- intervention_type: direct mapping
  a.intervention_type,

  -- api_cost_usd: direct mapping
  a.api_cost_usd,

  -- api_tokens_used: direct mapping
  a.api_tokens_used,

  -- api_model: direct mapping
  a.api_model,

  -- created_at: preserve original timestamp
  a.created_at

FROM actions a
WHERE NOT EXISTS (
  SELECT 1
  FROM activity_log al
  WHERE al.source_system = 'migration_actions'
    AND al.metadata->>'_source_id' = a.id::text
);
