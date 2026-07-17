// Register (or update) an agent operator in Cockpit's `operators` registry.
// Reusable for every new harness — Codex, GLM, Kimi K, etc. Idempotent upsert.
//
// Usage:
//   node scripts/add_agent_operator.mjs --id <slug> --name <Name> [options]
//
// Options (defaults in brackets):
//   --id <slug>            operator id / stable slug (REQUIRED)      e.g. glm, kimi
//   --name <text>          display name (REQUIRED)                   e.g. "GLM 4.6"
//   --role <text>          role label            [coder]
//   --adapter <type>       dispatch adapter      [herdr]  (herdr | hermes-oneshot | none)
//   --target <name>        herdr agent NAME to steer (NOT a pane id — herdr updates
//                          renumber panes). Convention: "<id>-dispatch".
//   --workdir <path>       default working dir named in the dispatch prompt
//                          [/Users/agentsmyth/workspaces/dev/cockpit]
//   --expect-agent <type>  herdr agent-type assertion (e.g. codex, claude)   [<id>]
//   --budget <cents>       monthly budget cap in cents, 0 = uncapped   [0]
//   --max-concurrent <n>   parallel task cap     [1]
//   --status <s>           active | paused | retired   [active]
//   --notes <text>         freeform notes
//   --dry-run              print the row that WOULD be written, don't touch the DB
//
// For a herdr agent you must also stand up an idle pane named <target>:
//   herdr workspace create --label <target> --cwd <workdir> --no-focus
//   herdr pane run <wN:p1> "<id>"        # launch the harness in that pane
//   herdr agent rename <wN:p1> <target>  # name it so dispatch can resolve it
// (Target by NAME; after any herdr version bump re-stamp the name.)
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

// --- tiny arg parser (--flag value, plus boolean --dry-run) ---
const argv = process.argv.slice(2)
const args = {}
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('--')) continue
  const key = a.slice(2)
  if (key === 'dry-run') { args[key] = true; continue }
  args[key] = argv[++i]
}

if (!args.id || !args.name) {
  console.error('ERROR: --id and --name are required.\nSee the header of this file for usage.')
  process.exit(1)
}

const id = args.id
const adapter = args.adapter ?? 'herdr'
const role = args.role ?? 'coder'
const status = args.status ?? 'active'
const budget = Number(args.budget ?? 0)
const maxConcurrent = Number(args['max-concurrent'] ?? 1)
const workdir = args.workdir ?? '/Users/agentsmyth/workspaces/dev/cockpit'
const target = args.target ?? `${id}-dispatch`
const expectAgent = args['expect-agent'] ?? id
const notes = args.notes ?? `${args.name} harness. Onboarded via add_agent_operator.mjs.`

// dispatch_config shape depends on the adapter. herdr steers a named pane.
const dispatchConfig =
  adapter === 'herdr'
    ? { workdir, herdr_target: target, expect_agent: expectAgent }
    : {}
const adapterType = adapter === 'none' ? null : adapter

const preview = {
  id, name: args.name, operator_type: 'agent', role, status,
  adapter_type: adapterType, dispatch_config: dispatchConfig,
  budget_monthly_cents: budget, max_concurrent: maxConcurrent, notes,
}

if (args['dry-run']) {
  console.log('DRY RUN — would upsert:')
  console.log(JSON.stringify(preview, null, 2))
  process.exit(0)
}

const sql = neon(process.env.DATABASE_URL)
await sql`
  INSERT INTO operators (
    id, name, operator_type, role, status,
    workspace_scope, capabilities, notes,
    budget_monthly_cents, spent_monthly_cents,
    adapter_type, dispatch_config, max_concurrent, active_run_count,
    created_at, updated_at
  ) VALUES (
    ${id}, ${args.name}, 'agent', ${role}, ${status},
    '{}'::text[], '{}'::text[], ${notes},
    ${budget}, 0,
    ${adapterType}, ${JSON.stringify(dispatchConfig)}::jsonb, ${maxConcurrent}, 0,
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
    budget_monthly_cents = EXCLUDED.budget_monthly_cents,
    max_concurrent = EXCLUDED.max_concurrent,
    updated_at = NOW()
`
const [row] = await sql`select id, name, operator_type, role, status, adapter_type, dispatch_config, max_concurrent, budget_monthly_cents from operators where id=${id}`
console.log('operator upserted:')
console.log(JSON.stringify(row, null, 2))
