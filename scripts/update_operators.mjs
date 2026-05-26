import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
  process.env[key] = val
}

const sql = neon(process.env.DATABASE_URL)

async function update() {
  try {
    console.log('Retiring Charlie...')
    await sql`
      UPDATE operators 
      SET status = 'retired', role = 'Chief of Staff (Deprecated) — orchestration, comms, review, routing'
      WHERE id = 'charlie'
    `

    console.log('Upserting Hermes as primary autonomous agent...')
    await sql`
      INSERT INTO operators (id, name, operator_type, role, status, budget_monthly_cents, spent_monthly_cents, created_at, updated_at)
      VALUES (
        'hermes',
        'Hermes',
        'agent',
        'Chief of Staff — workspace orchestration, task routing, strategic steering',
        'active',
        20000,
        0,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        operator_type = EXCLUDED.operator_type,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        budget_monthly_cents = EXCLUDED.budget_monthly_cents,
        updated_at = NOW()
    `

    console.log('Querying updated operators...')
    const operators = await sql`SELECT id, name, operator_type, role, status, budget_monthly_cents FROM operators;`
    console.log(JSON.stringify(operators, null, 2))
  } catch (err) {
    console.error('Error updating operators:', err)
  }
}

update()
