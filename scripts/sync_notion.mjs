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

// Now we can import the sync function
const { syncAllNotionDatabases } = await import('../lib/notion-sync.ts')

async function run() {
  console.log('Starting Notion-to-Cockpit database sync...')
  try {
    const results = await syncAllNotionDatabases()
    console.log('Sync completed with results:')
    console.log(JSON.stringify(results, null, 2))
    process.exit(0)
  } catch (err) {
    console.error('Error running sync:', err)
    process.exit(1)
  }
}

run()
