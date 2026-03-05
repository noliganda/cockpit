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

// Data from Oli's Notion screenshots (2026-03-05)
const spheres = [
  // ── BYRON FILM ────────────────────────────────────────────────────────────
  {
    workspace_id: 'byron-film',
    name: 'Leadership',
    context: 'Internal',
    description: 'Creating a culture in which a business can thrive',
    spheres: ['Vision & Values', 'Management', 'Communication'],
  },
  {
    workspace_id: 'byron-film',
    name: 'Finances',
    context: 'Internal',
    description: 'Ensure sustainability of the business',
    spheres: ['Revenue', 'Expenses', 'Profit', 'Assets', 'Liabilities', 'Capital', 'Taxes'],
  },
  {
    workspace_id: 'byron-film',
    name: 'Operations',
    context: 'Internal',
    description: 'Minimise risk in the business',
    spheres: ['Form of Company', 'Insurance', 'Contracts', 'Human Resources', 'Process', 'Technology', 'Measurement'],
  },
  {
    workspace_id: 'byron-film',
    name: 'Growth',
    context: 'Internal',
    description: 'Optimise the business',
    spheres: ['Reinvestment', 'Anticipation / Developing a POV', 'Innovation', 'Accepting Change & Driving It'],
  },
  {
    workspace_id: 'byron-film',
    name: 'Production',
    context: 'External',
    description: 'Produce a predictable unit of value',
    spheres: ['R&D', 'Design & Production', 'Quality Control', 'Pricing', 'Treatments', 'Location Scouting', 'Contracts & Permits', 'Creative Dev', 'Pre-Prod / Planning'],
  },
  {
    workspace_id: 'byron-film',
    name: 'Service',
    context: 'External',
    description: 'Maximise customer satisfaction',
    spheres: ['Fixing What Goes Wrong', 'Guarantee', 'Relationship'],
  },
  {
    workspace_id: 'byron-film',
    name: 'Sales',
    context: 'External',
    description: 'Generate revenue',
    spheres: ['Point of Sale', 'Sales Methods', 'Model for Selling'],
  },
  {
    workspace_id: 'byron-film',
    name: 'Marketing',
    context: 'External',
    description: 'Identify, understand, and generate demand',
    spheres: ['Brand', 'Reach', 'Content', 'Channels'],
  },
  {
    workspace_id: 'byron-film',
    name: 'AI/Automations',
    context: 'Internal',
    description: 'Leverage AI and automation to multiply output',
    spheres: ['Workflows', 'Integrations', 'Data & Analytics', 'AI Tools', 'Automation Pipelines'],
  },

  // ── KORUS ─────────────────────────────────────────────────────────────────
  {
    workspace_id: 'korus',
    name: 'Leadership',
    context: 'Internal',
    description: 'Creating a culture in which a business can thrive',
    spheres: ['Culture', 'Vision', 'Team Management'],
  },
  {
    workspace_id: 'korus',
    name: 'Finances',
    context: 'Internal',
    description: 'Ensure sustainability of the business',
    spheres: ['Revenue', 'Expenses', 'Profit', 'Assets', 'Budgeting', 'Capital', 'Taxes & Incentives', 'Liabilities'],
  },
  {
    workspace_id: 'korus',
    name: 'Operations',
    context: 'Internal',
    description: 'Minimise risk in the business',
    spheres: ['HR', 'Technology', 'Process', 'Insurance', 'Measurement', 'Contracts', 'Legal / Form of Company'],
  },
  {
    workspace_id: 'korus',
    name: 'Growth',
    context: 'Internal',
    description: 'Optimise the business',
    spheres: ['Anticipation / POV', 'Reinvestments', 'Change Management', 'Market Trends', 'Innovation'],
  },
  {
    workspace_id: 'korus',
    name: 'Production',
    context: 'External',
    description: 'Produce a predictable unit of value',
    spheres: ['R&D', 'Design & Production', 'Quality Control', 'Pricing', 'Contracts & Permits'],
  },
  {
    workspace_id: 'korus',
    name: 'Service',
    context: 'External',
    description: 'Maximise customer satisfaction',
    spheres: ['Customer Relationship', 'Guarantee', 'Issue Resolution'],
  },
  {
    workspace_id: 'korus',
    name: 'Sales',
    context: 'External',
    description: 'Generate revenue',
    spheres: ['Point of Sale', 'Model for Selling', 'Sales Methods'],
  },
  {
    workspace_id: 'korus',
    name: 'Marketing',
    context: 'External',
    description: 'Identify, understand, and generate demand',
    spheres: ['Brand', 'Reach', 'Channels', 'Content'],
  },
]

console.log('Updating areas with spheres of responsibility...')
for (const area of spheres) {
  const result = await sql`
    UPDATE areas
    SET
      description = ${area.description},
      context = ${area.context},
      spheres_of_responsibility = ${area.spheres},
      updated_at = NOW()
    WHERE workspace_id = ${area.workspace_id}
      AND name = ${area.name}
    RETURNING id, name
  `
  if (result.length > 0) {
    console.log(`  ✓ ${area.workspace_id} / ${area.name}`)
  } else {
    console.log(`  ✗ NOT FOUND: ${area.workspace_id} / ${area.name}`)
  }
}

console.log('Done!')
