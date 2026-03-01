import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse .env.local manually
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

const workspaces = [
  { id: 'byron-film', name: 'Byron Film', slug: 'byron-film', color: '#D4A017', icon: '🎬' },
  { id: 'korus', name: 'KORUS Group', slug: 'korus', color: '#008080', icon: '🌏' },
  { id: 'personal', name: 'Personal', slug: 'personal', color: '#F97316', icon: '👤' },
]

const areas = [
  { workspace_id: 'byron-film', name: 'Leadership', icon: '👑', order_idx: 1 },
  { workspace_id: 'byron-film', name: 'Finances', icon: '💰', order_idx: 2 },
  { workspace_id: 'byron-film', name: 'Operations', icon: '⚙️', order_idx: 3 },
  { workspace_id: 'byron-film', name: 'Growth', icon: '📈', order_idx: 4 },
  { workspace_id: 'byron-film', name: 'Production', icon: '🎬', order_idx: 5 },
  { workspace_id: 'byron-film', name: 'Service', icon: '🎯', order_idx: 6 },
  { workspace_id: 'byron-film', name: 'Sales', icon: '💼', order_idx: 7 },
  { workspace_id: 'byron-film', name: 'Marketing', icon: '📣', order_idx: 8 },
  { workspace_id: 'byron-film', name: 'AI/Automations', icon: '🤖', order_idx: 9 },
  { workspace_id: 'korus', name: 'Leadership', icon: '👑', order_idx: 1 },
  { workspace_id: 'korus', name: 'Finances', icon: '💰', order_idx: 2 },
  { workspace_id: 'korus', name: 'Operations', icon: '⚙️', order_idx: 3 },
  { workspace_id: 'korus', name: 'Growth', icon: '📈', order_idx: 4 },
  { workspace_id: 'korus', name: 'Production', icon: '🏗️', order_idx: 5 },
  { workspace_id: 'korus', name: 'Service', icon: '🎯', order_idx: 6 },
  { workspace_id: 'korus', name: 'Sales', icon: '💼', order_idx: 7 },
  { workspace_id: 'korus', name: 'Marketing', icon: '📣', order_idx: 8 },
  { workspace_id: 'personal', name: 'Life Admin', icon: '🏠', order_idx: 1 },
  { workspace_id: 'personal', name: 'Health', icon: '💪', order_idx: 2 },
  { workspace_id: 'personal', name: 'Learning', icon: '📚', order_idx: 3 },
]

console.log('Seeding workspaces...')
for (const ws of workspaces) {
  await sql`INSERT INTO workspaces (id, name, slug, color, icon, created_at, updated_at)
    VALUES (${ws.id}, ${ws.name}, ${ws.slug}, ${ws.color}, ${ws.icon}, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING`
  console.log('  ok', ws.name)
}

console.log('Seeding areas...')
for (const area of areas) {
  await sql`INSERT INTO areas (id, workspace_id, name, icon, "order", created_at, updated_at)
    VALUES (gen_random_uuid(), ${area.workspace_id}, ${area.name}, ${area.icon}, ${area.order_idx}, NOW(), NOW())
    ON CONFLICT DO NOTHING`
  console.log('  ok', area.workspace_id, area.name)
}

console.log('Done!')
