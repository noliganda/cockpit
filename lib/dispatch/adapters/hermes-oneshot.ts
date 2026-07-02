/**
 * hermes-oneshot adapter — `hermes chat -Q -q "<prompt>"` fire-and-forget (spec §5.3).
 *
 * Best for short, bounded tasks with no session continuity. The prompt embeds
 * the task context plus the cockpit-wiring self-registration instructions
 * (cockpit-wiring.md §8) so the spawned harness registers its model/session
 * footprint and drives the task lifecycle through the API itself.
 *
 * Command safety (spec §9): the child is spawned with an args ARRAY and no
 * shell, so task titles/descriptions can never be interpreted by a shell.
 * Secrets are never placed in the prompt — it references env var NAMES only.
 *
 * Session id capture: `-Q` mode prints `session_id: <id>` on stdout early in
 * the run. The child's stdout/stderr are redirected to a per-dispatch log file
 * (a pipe would EPIPE the child once the parent stops reading; a file also
 * leaves a debuggable artifact), which is polled for the id for up to
 * sessionIdWaitMs before falling back to the pid-based placeholder.
 *
 * dispatch_config params (all optional):
 *   model            — passed as `-m` (e.g. "anthropic/claude-sonnet-4")
 *   toolsets         — string[] passed comma-joined as `-t`
 *   maxTurns         — passed as `--max-turns`
 *   workdir          — cwd for the spawned process + workspace path in the prompt
 *   command          — override the executable (testing / non-standard installs)
 *   extraArgs        — string[] appended verbatim before the query flag
 *   sessionIdWaitMs  — how long to poll for `session_id:` (default 5000, 0 = skip)
 */
import { spawn } from 'node:child_process'
import { mkdirSync, openSync, closeSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildDispatchPrompt } from './prompt'
import type { DispatchOperator, DispatchResult, DispatchTask, HarnessAdapter } from './types'

export interface OneshotConfig {
  model?: string
  toolsets?: string[]
  maxTurns?: number
  workdir?: string
  command?: string
  extraArgs?: string[]
  sessionIdWaitMs?: number
}

const SESSION_ID_RE = /^\s*session_id:\s*(\S+)/m
const POLL_INTERVAL_MS = 250
const DEFAULT_SESSION_ID_WAIT_MS = 5000

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** Poll the child's log file for `session_id: <id>` until deadline. */
export async function pollForSessionId(logPath: string, waitMs: number): Promise<string | null> {
  const deadline = Date.now() + waitMs
  for (;;) {
    try {
      const match = SESSION_ID_RE.exec(readFileSync(logPath, 'utf8'))
      if (match) return match[1]
    } catch { /* file may not exist yet */ }
    if (Date.now() >= deadline) return null
    await sleep(Math.min(POLL_INTERVAL_MS, Math.max(1, deadline - Date.now())))
  }
}

/**
 * Spawn a hermes-style oneshot child with output to a per-dispatch log file
 * and capture its printed session id. Shared with hermes-delegate.
 */
export async function spawnOneshot(
  label: string,
  command: string,
  args: string[],
  config: Pick<OneshotConfig, 'workdir' | 'sessionIdWaitMs'>,
  taskId: string,
): Promise<DispatchResult> {
  const logDir = join(tmpdir(), 'cockpit-dispatch')
  mkdirSync(logDir, { recursive: true })
  const logPath = join(logDir, `${taskId}-${Date.now()}.log`)
  const logFd = openSync(logPath, 'a')

  const spawned = await new Promise<{ pid: number } | { error: Error }>((resolve) => {
    const child = spawn(command, args, {
      cwd: config.workdir,
      detached: true,
      stdio: ['ignore', logFd, logFd],
    })
    child.once('spawn', () => {
      child.unref()
      resolve({ pid: child.pid! })
    })
    child.once('error', (error) => resolve({ error }))
  })
  closeSync(logFd)

  if ('error' in spawned) {
    return {
      sessionId: `${label}-failed`,
      status: 'failed',
      detail: `failed to spawn ${command}: ${spawned.error.message}`,
    }
  }

  const waitMs = config.sessionIdWaitMs ?? DEFAULT_SESSION_ID_WAIT_MS
  const sessionId = waitMs > 0 ? await pollForSessionId(logPath, waitMs) : null
  if (sessionId) {
    return {
      sessionId,
      status: 'spawned',
      detail: `${command} spawned (pid ${spawned.pid}, hermes session ${sessionId}), log ${logPath}`,
    }
  }
  return {
    sessionId: `${label}-pid-${spawned.pid}`,
    status: 'spawned',
    detail: `${command} spawned (pid ${spawned.pid}, session id not observed within ${waitMs}ms), log ${logPath}`,
  }
}

export function buildOneshotArgs(config: OneshotConfig, prompt: string): { command: string; args: string[] } {
  const command = config.command ?? 'hermes'
  const args: string[] = config.command ? [] : ['chat', '-Q']
  if (config.model) args.push('-m', config.model)
  if (config.toolsets?.length) args.push('-t', config.toolsets.join(','))
  if (config.maxTurns) args.push('--max-turns', String(config.maxTurns))
  if (config.extraArgs?.length) args.push(...config.extraArgs)
  if (!config.command) args.push('-q', prompt)
  return { command, args }
}

export const hermesOneshotAdapter: HarnessAdapter = {
  type: 'hermes-oneshot',
  staleClaimThresholdMs: 5 * 60 * 1000, // oneshot runs are short; a 5-min-silent claim is dead (spec §10 Q3)

  async dispatch(task: DispatchTask, operator: DispatchOperator, _wakeup, context): Promise<DispatchResult> {
    const config = (operator.dispatchConfig ?? {}) as OneshotConfig
    const prompt = buildDispatchPrompt(task, { workdir: config.workdir }, context)
    const { command, args } = buildOneshotArgs(config, prompt)
    return spawnOneshot('oneshot', command, args, config, task.id)
  },
}
