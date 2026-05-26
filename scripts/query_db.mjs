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

async function query() {
  try {
    const workspaces = await sql`SELECT id, name, slug FROM workspaces;`
    console.log('Workspaces:')
    console.log(JSON.stringify(workspaces, null, 2))

    const operators = await sql`SELECT id, name, operator_type, role, status FROM operators;`
    console.log('Operators:')
    console.log(JSON.stringify(operators, null, 2))

    const taskCount = await sql`SELECT COUNT(*) FROM tasks;`
    console.log('Total Tasks:', taskCount[0].count)

    const sampleTasks = await sql`SELECT id, title, status, priority, assignee_id FROM tasks LIMIT 10;`
    console.log('Sample Tasks:')
    console.log(JSON.stringify(sampleTasks, null, 2))

    const projectCount = await sql`SELECT COUNT(*) FROM projects;`
    console.log('Total Projects:', projectCount[0].count)
  } catch (err) {
    console.error('Error querying database:', err)
  }
}

query()
