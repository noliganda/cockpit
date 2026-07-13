/**
 * Cockpit ⇄ Twenty reconcile + outbound worker (task c68df6e1).
 *
 * Runs on the Mac Mini (launchd, every 15 min) — NOT on Vercel, because Twenty is
 * tailnet-only and the public app can't reach it. Two passes:
 *
 *   outbound  — push Cockpit contacts changed since their last sync INTO Twenty
 *               (create/patch, matched by twentyPersonId → vcardUid → email).
 *   inbound   — reconcile: page Twenty people (newest-updated first) and upsert
 *               into Cockpit, catching any webhook that was missed or 500'd.
 *               Bounded by --since=<hours> (stops once it walks past the cutoff).
 *
 * Both directions diff before writing, so this is idempotent and loop-safe.
 *
 * Env: DATABASE_URL (self-loaded from .env.local, repo convention), TWENTY_OM_API_KEY
 * (injected from SOPS by the launchd entrypoint — never in .env.local).
 * Run: scripts/crm/run-twenty-worker.sh [both|outbound|inbound] [--since=H] [--dry-run]
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// Type-only imports are fully erased — they never trigger @/lib/db at load time,
// so the .env.local preamble below can run before the real (dynamic) import.
import type * as SyncMod from '@/lib/crm/twenty-sync'

type TwentyClientT = InstanceType<typeof SyncMod.TwentyClient>
type Sync = typeof SyncMod
type OutboundAction = 'created' | 'updated' | 'unchanged'
type InboundAction = 'created' | 'updated' | 'unchanged' | 'detached'

/**
 * Load .env.local into process.env BEFORE any @/lib import — lib/db throws at
 * import time if DATABASE_URL is unset. Real env wins (so the SOPS-injected token
 * and any launchd overrides are never clobbered by the file).
 */
function loadEnvLocal(): void {
  const here = dirname(fileURLToPath(import.meta.url))
  const envPath = resolve(here, '../../.env.local')
  let content: string
  try {
    content = readFileSync(envPath, 'utf8')
  } catch {
    return // rely on ambient env
  }
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    if (process.env[key] !== undefined) continue
    process.env[key] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
}

interface Args {
  mode: 'both' | 'outbound' | 'inbound'
  sinceHours: number
  dryRun: boolean
}

function parseArgs(argv: string[]): Args {
  let mode: Args['mode'] = 'both'
  let sinceHours = 26 // overlap a daily cadence with margin
  let dryRun = false
  for (const a of argv) {
    if (a === 'both' || a === 'outbound' || a === 'inbound') mode = a
    else if (a === '--dry-run') dryRun = true
    else if (a.startsWith('--since=')) sinceHours = Number(a.slice('--since='.length)) || sinceHours
  }
  return { mode, sinceHours, dryRun }
}

const stamp = (): string => new Date().toISOString()

async function outboundPass(sync: Sync, client: TwentyClientT, workspace: string, dryRun: boolean): Promise<void> {
  const pending = await sync.contactsPendingOutbound(workspace)
  const counts: Record<OutboundAction | 'failed', number> = { created: 0, updated: 0, unchanged: 0, failed: 0 }
  for (const c of pending) {
    if (dryRun) {
      console.log(`  would push ${c.id} "${c.name}" (twentyPersonId=${c.twentyPersonId ?? '—'})`)
      continue
    }
    try {
      const r = await sync.pushContactToTwenty(client, c)
      counts[r.action]++
    } catch (err) {
      counts.failed++
      console.error(`  push failed ${c.id} "${c.name}":`, err instanceof Error ? err.message : err)
    }
  }
  console.log(
    `[${stamp()}] outbound: ${pending.length} pending → created=${counts.created} updated=${counts.updated} unchanged=${counts.unchanged} failed=${counts.failed}`,
  )
}

async function inboundPass(sync: Sync, client: TwentyClientT, twentyWorkspaceId: string, sinceHours: number, dryRun: boolean): Promise<void> {
  const cutoff = Date.now() - sinceHours * 3600_000
  const counts: Record<InboundAction | 'failed', number> = { created: 0, updated: 0, unchanged: 0, detached: 0, failed: 0 }
  let scanned = 0

  await client.eachPerson(async (people) => {
    for (const p of people) {
      // newest-first ordering → the first record older than the cutoff ends the walk
      const updatedMs = p.updatedAt ? new Date(p.updatedAt).getTime() : NaN
      if (Number.isFinite(updatedMs) && updatedMs < cutoff) return false
      scanned++
      if (dryRun) continue
      try {
        const r = await sync.upsertContactFromTwentyPerson(p, { twentyWorkspaceId, via: 'reconcile' })
        counts[r.action]++
      } catch (err) {
        counts.failed++
        console.error(`  upsert failed person=${p.id}:`, err instanceof Error ? err.message : err)
      }
    }
    return true
  })

  console.log(
    `[${stamp()}] inbound: scanned=${scanned} (since ${sinceHours}h) → created=${counts.created} updated=${counts.updated} unchanged=${counts.unchanged} failed=${counts.failed}`,
  )
}

async function main(): Promise<void> {
  loadEnvLocal()
  const { mode, sinceHours, dryRun } = parseArgs(process.argv.slice(2))

  // Deferred so loadEnvLocal() runs before lib/db reads DATABASE_URL.
  const sync = await import('@/lib/crm/twenty-sync')
  const { cockpitWorkspaceForTwenty, TWENTY_OM_WORKSPACE_ID } = await import('@/lib/crm/twenty-mapping')
  const workspace = cockpitWorkspaceForTwenty(TWENTY_OM_WORKSPACE_ID)

  const client = new sync.TwentyClient()
  console.log(`[${stamp()}] twenty-worker start — mode=${mode} since=${sinceHours}h dryRun=${dryRun} base=${client.base} workspace=${workspace}`)

  if (mode === 'both' || mode === 'outbound') await outboundPass(sync, client, workspace, dryRun)
  if (mode === 'both' || mode === 'inbound') await inboundPass(sync, client, TWENTY_OM_WORKSPACE_ID, sinceHours, dryRun)

  console.log(`[${stamp()}] twenty-worker done`)
}

main().catch((err) => {
  console.error(`[${stamp()}] twenty-worker FATAL:`, err)
  process.exit(1)
})
