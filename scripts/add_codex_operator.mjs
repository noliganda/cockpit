// Register the OpenAI Codex CLI as a first-class Cockpit agent operator.
// Mirrors update_operators.mjs. Idempotent (ON CONFLICT DO UPDATE).
//
// Dispatch: herdr adapter (agent-agnostic transport, same one claude-code uses).
// Target is the AGENT NAME `codex-dispatch`, NOT a pane id — herdr self-updates
// renumber pane ids and clear agent names, so a dedicated idle codex pane must be
// (re-)named `codex-dispatch` for dispatch to resolve it. See project memory
// cockpit-herdr-dispatch-worker.
//
// Role coder, uncapped budget, max_concurrent 1 — parity with claude-code.
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__dirname, '../.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const sql = neon(process.env.DATABASE_URL)

const dispatchConfig = {
  workdir: '/Users/agentsmyth/workspaces/dev/cockpit',
  herdr_target: 'codex-dispatch',
  expect_agent: 'codex',
}
const notes =
  'OpenAI Codex CLI harness (@openai/codex). Dispatch via herdr adapter → agent named ' +
  '"codex-dispatch" (a dedicated idle codex pane; target by NAME not pane id — herdr updates ' +
  'renumber panes). Onboarded 2026-07-17. Parity with claude-code.'

await sql`
  INSERT INTO operators (
    id, name, operator_type, role, status,
    workspace_scope, capabilities, notes,
    budget_monthly_cents, spent_monthly_cents,
    adapter_type, dispatch_config, max_concurrent, active_run_count,
    created_at, updated_at
  ) VALUES (
    'codex', 'Codex', 'agent', 'coder', 'active',
    '{}'::text[], '{}'::text[], ${notes},
    0, 0,
    'herdr', ${JSON.stringify(dispatchConfig)}::jsonb, 1, 0,
    NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    operator_type = EXCLUDED.operator_type,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    adapter_type = EXCLUDED.adapter_type,
    dispatch_config = EXCLUDED.dispatch_config,
    max_concurrent = EXCLUDED.max_concurrent,
    updated_at = NOW()
`

const [row] = await sql`select id, name, operator_type, role, status, adapter_type, dispatch_config, max_concurrent, budget_monthly_cents from operators where id='codex'`
console.log('codex operator upserted:')
console.log(JSON.stringify(row, null, 2))
