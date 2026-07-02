/**
 * Shared probe bootstrap: loads .env.local (same convention as scripts/*.mjs —
 * probes run outside Next, which won't load it for them) and provides tiny
 * assertion helpers. Probes are this repo's executable verification layer:
 * there is no test framework, so each dispatch-engine requirement gets a probe
 * under scripts/probes/ that exits non-zero when the feature is broken.
 *
 * Run: npx tsx scripts/probes/<name>.ts
 * All probe-created rows use the [E2E-TEST] title prefix and are deleted in a
 * finally block; every probe ends by asserting its own residue is zero.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../../.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  if (process.env[key] !== undefined) continue
  process.env[key] = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
}

export const TEST_PREFIX = '[E2E-TEST]'

let failures = 0

export function check(name: string, ok: boolean, detail?: string) {
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

export function finish(probeName: string): never {
  if (failures > 0) {
    console.log(`\n${probeName}: ${failures} check(s) FAILED`)
    process.exit(1)
  }
  console.log(`\n${probeName}: all checks passed`)
  process.exit(0)
}
