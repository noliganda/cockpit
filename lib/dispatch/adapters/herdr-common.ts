/**
 * Shared herdr steering for the `herdr` adapter (dispatch spec §5.3).
 *
 * herdr exposes a JSON socket API over its terminal multiplexer; we drive it
 * through the `herdr` CLI. Like tmux-common, every invocation is an arg-array
 * spawn — no shell, no interpolation. Targets come from operator dispatch_config
 * (operator-controlled, never task-controlled).
 *
 * Why herdr over tmux (the whole point of this adapter):
 *  - `agent send` writes the prompt as LITERAL text, then a SEPARATE
 *    `pane send-keys <pane> Enter` submits it — this sidesteps the
 *    `[Pasted text #1]`-doesn't-submit failure the tmux paste path has.
 *  - `agent list`/`agent get` expose a live `agent_status` (idle/working/…),
 *    so we can (a) refuse to inject into a busy agent and (b) confirm the
 *    prompt actually started the agent working — a signal tmux cannot give.
 *
 * herdr is AGENT-AGNOSTIC: it detects claude/codex/gemini/pi/cursor and tags
 * each pane's `agent`. Nothing here assumes a specific agent — the same code
 * steers any of them. That is why the adapter is named for the transport
 * (`herdr`), not for a harness.
 */
import { spawn } from 'node:child_process'

interface HerdrRun {
  code: number
  stdout: string
  stderr: string
}

/** One live agent pane as reported by `herdr agent get/list`. */
export interface HerdrAgentInfo {
  paneId: string
  agent: string | null // detected harness label: 'claude' | 'codex' | … | null for a bare shell
  agentStatus: string // 'idle' | 'working' | 'blocked' | 'unknown'
  cwd: string | null
}

function runHerdr(args: string[]): Promise<HerdrRun> {
  return new Promise((resolve) => {
    const child = spawn('herdr', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => { stdout += String(d) })
    child.stderr?.on('data', (d) => { stderr += String(d) })
    child.once('error', (err) => resolve({ code: 127, stdout: '', stderr: err.message }))
    child.once('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Resolve a dispatch target (pane_id, terminal_id, or unique agent name) to its
 * live agent record. Returns null if herdr doesn't know the target or reports no
 * agent for it. One call covers existence + the idle precondition + the agent
 * label, so the adapter never needs a second lookup.
 *
 * NB: a bare agent-type label like "claude" is NOT unique when several panes run
 * the same agent — operators must target a pane_id or a renamed unique agent.
 */
export async function herdrResolveTarget(target: string): Promise<HerdrAgentInfo | null> {
  const run = await runHerdr(['agent', 'get', target])
  if (run.code !== 0) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(run.stdout)
  } catch {
    return null
  }
  const agent = (parsed as { result?: { agent?: Record<string, unknown> } })?.result?.agent
  if (!agent || typeof agent.pane_id !== 'string') return null
  return {
    paneId: agent.pane_id,
    agent: typeof agent.agent === 'string' ? agent.agent : null,
    agentStatus: typeof agent.agent_status === 'string' ? agent.agent_status : 'unknown',
    cwd: typeof agent.cwd === 'string' ? agent.cwd : null,
  }
}

/**
 * Write `text` as literal input to the target agent, then submit with Enter.
 * Two calls by design (herdr's own guidance): `agent send` writes literal text
 * without submitting; the separate `send-keys Enter` submits it. Returns an
 * error string, or null on success.
 */
export async function herdrSendAndSubmit(paneId: string, text: string): Promise<string | null> {
  const send = await runHerdr(['agent', 'send', paneId, text])
  if (send.code !== 0) return `herdr agent send failed: ${send.stderr.trim() || `exit ${send.code}`}`
  // Let the TUI ingest the literal text before the submit key (mirrors the tmux path).
  await sleep(400)
  const enter = await runHerdr(['pane', 'send-keys', paneId, 'Enter'])
  if (enter.code !== 0) return `herdr pane send-keys Enter failed: ${enter.stderr.trim() || `exit ${enter.code}`}`
  return null
}

/**
 * Block until the target agent reaches `status` (or `timeoutMs` elapses).
 * Returns true if the status was reached. Best-effort submission signal — a
 * false return is not proof of failure (a very fast agent can pass through
 * `working` before we observe it), so callers pair this with a read-back.
 */
export async function herdrWaitStatus(paneId: string, status: string, timeoutMs: number): Promise<boolean> {
  const run = await runHerdr(['agent', 'wait', paneId, '--status', status, '--timeout', String(timeoutMs)])
  return run.code === 0
}

/**
 * Read the target agent's visible screen. `--source visible` is deliberate:
 * `recent` comes back empty on a headless server (no attached viewport).
 */
export async function herdrReadVisible(paneId: string, lines = 40): Promise<string> {
  const run = await runHerdr(['agent', 'read', paneId, '--source', 'visible', '--lines', String(lines)])
  return run.code === 0 ? run.stdout : ''
}
