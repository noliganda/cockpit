/**
 * herdr adapter smoke harness (not a gate probe — needs a live herdr server).
 *
 *   verify  — READ-ONLY: resolve live panes through herdrResolveTarget, assert
 *             the JSON contract my code depends on still holds. Mutates nothing.
 *   e2e     — spawn a throwaway claude agent pane, drive it through the transport
 *             primitives (send+submit+working-wait+read-back), assert a PONG
 *             round-trips, then close the pane. Spawns a real agent (costs budget)
 *             and briefly adds a pane to the live herdr session.
 *   cleanup — close any leftover cockpit-herdr-smoke panes.
 *
 * Run: npx tsx scripts/probes/e2e/_herdr-smoke.ts [verify|e2e|cleanup]
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import {
  herdrResolveTarget,
  herdrSendAndSubmit,
  herdrWaitStatus,
  herdrReadVisible,
} from '@/lib/dispatch/adapters/herdr-common'

function herdr(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('herdr', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => { stdout += String(d) })
    child.stderr?.on('data', (d) => { stderr += String(d) })
    child.once('error', (e) => resolve({ code: 127, stdout: '', stderr: e.message }))
    child.once('close', (c) => resolve({ code: c ?? 1, stdout, stderr }))
  })
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
let failures = 0
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

async function firstIdleAgentPane(): Promise<string | null> {
  const run = await herdr(['agent', 'list'])
  if (run.code !== 0) return null
  const agents = JSON.parse(run.stdout)?.result?.agents ?? []
  const idle = agents.find((a: Record<string, unknown>) => a.agent_status === 'idle' && !a.focused)
  return idle ? (idle.pane_id as string) : null
}

async function verify() {
  // A live idle pane we can resolve read-only (never the focused/working one).
  const paneId = await firstIdleAgentPane()
  check('found a live idle agent pane to resolve', !!paneId, paneId ?? 'none')
  if (paneId) {
    const info = await herdrResolveTarget(paneId)
    check('herdrResolveTarget parses live pane', !!info && info.paneId === paneId, JSON.stringify(info))
    check('resolved record carries agent + status', !!info?.agent && !!info?.agentStatus, `${info?.agent}/${info?.agentStatus}`)
  }
  const bogus = await herdrResolveTarget('w0:p999-nonexistent')
  check('herdrResolveTarget returns null for unknown target', bogus === null)
  console.log(failures ? `\n${failures} FAILED` : '\nverify OK')
  process.exit(failures ? 1 : 0)
}

async function paneIds(): Promise<Set<string>> {
  const run = await herdr(['agent', 'list'])
  const agents = JSON.parse(run.stdout)?.result?.agents ?? []
  return new Set(agents.map((a: Record<string, unknown>) => a.pane_id as string))
}

async function e2e() {
  const nonce = process.env.SMOKE_NONCE || 'NONCE'
  const marker = `HERDR-PONG-${nonce}`
  // Spawn in an already-trusted dir (the repo) so there's no first-run trust
  // prompt; let herdr's own claude manifest launch it (no argv override — that
  // gets misread as the binary). The throwaway agent only echoes a token.
  const scratch = process.env.SMOKE_CWD || process.cwd()

  const claudeBin = process.env.SMOKE_CLAUDE_BIN || '/opt/homebrew/bin/claude'
  const before = await paneIds()
  console.log('spawning throwaway claude agent…')
  // herdr's spawn PATH is minimal, so argv[0] must be the absolute binary; the
  // interactive `claude` shell function unsets ANTHROPIC_API_KEY, so mirror that
  // (empty env value) to use the subscription rather than metered API billing.
  const start = await herdr([
    'agent', 'start', 'claude', '--cwd', scratch, '--no-focus',
    '--env', 'ANTHROPIC_API_KEY=', '--', claudeBin,
  ])
  check('agent start returned ok', start.code === 0, start.stderr.trim())

  // The new pane is whatever pane_id appeared since `before` (cwd may collide
  // with this very session, so diff by id, not cwd).
  let paneId: string | null = null
  for (let i = 0; i < 24 && !paneId; i++) {
    await sleep(1500)
    const run = await herdr(['agent', 'list'])
    const agents = JSON.parse(run.stdout)?.result?.agents ?? []
    const fresh = agents.find((a: Record<string, unknown>) =>
      !before.has(a.pane_id as string) && a.agent_status === 'idle')
    if (fresh) paneId = fresh.pane_id as string
  }
  check('scratch agent reached idle', !!paneId, paneId ?? 'never idle')
  if (!paneId) { console.log(`\n${failures} FAILED`); process.exit(1) }

  // The marker is COMPUTED (a+b) and never appears in the prompt, so finding it
  // in the read-back proves the agent received, SUBMITTED, processed and replied
  // — not merely that unsubmitted text sits echoed in the input box.
  const a = 1000
  const b = Number(nonce) || 4242
  const sum = a + b
  const answer = `PONG-${sum}`
  const sendErr = await herdrSendAndSubmit(
    paneId,
    `Reply with exactly the text PONG- followed by the sum of ${a} and ${b}, and nothing else. Do not use any tools.`,
  )
  check('herdrSendAndSubmit ok', sendErr === null, sendErr ?? '')
  // Best-effort submission signal — races on a fast reply, so informational only;
  // the adapter's real gate is "went working OR the dispatch landed in the pane".
  const worked = await herdrWaitStatus(paneId, 'working', 20_000)
  console.log(`      (info) agent-status reached 'working' within 20s: ${worked}`)
  // Give it time to answer, then confirm the COMPUTED reply is present.
  await herdrWaitStatus(paneId, 'idle', 60_000)
  const visible = await herdrReadVisible(paneId, 80)
  check('agent computed + replied the marker (submit round-trip)', visible.includes(answer), `looked for ${answer}`)
  void marker

  await herdr(['pane', 'close', paneId])
  check('scratch pane closed', true)
  console.log(failures ? `\n${failures} FAILED` : '\ne2e OK')
  process.exit(failures ? 1 : 0)
}

async function cleanup() {
  const run = await herdr(['pane', 'list'])
  const panes = JSON.parse(run.stdout)?.result?.panes ?? []
  const scratch = panes.filter((p: Record<string, unknown>) => p.cwd === '/tmp/cockpit-herdr-smoke')
  for (const p of scratch) await herdr(['pane', 'close', p.pane_id as string])
  console.log(`closed ${scratch.length} scratch pane(s)`)
  process.exit(0)
}

const mode = process.argv[2] ?? 'verify'
;(mode === 'e2e' ? e2e : mode === 'cleanup' ? cleanup : verify)().catch((e) => { console.error(e); process.exit(1) })
