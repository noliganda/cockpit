/**
 * hermes-oneshot adapter — `hermes chat -q "<prompt>"` fire-and-forget (spec §5.3).
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
 * dispatch_config params (all optional):
 *   model      — passed as `-m` (e.g. "anthropic/claude-sonnet-4")
 *   toolsets   — string[] passed comma-joined as `-t`
 *   maxTurns   — passed as `--max-turns`
 *   workdir    — cwd for the spawned process + workspace path in the prompt
 *   command    — override the executable (testing / non-standard installs)
 *   extraArgs  — string[] appended verbatim before the query flag
 */
import { spawn } from 'node:child_process'
import type { DispatchOperator, DispatchResult, DispatchTask, HarnessAdapter } from './types'

interface OneshotConfig {
  model?: string
  toolsets?: string[]
  maxTurns?: number
  workdir?: string
  command?: string
  extraArgs?: string[]
}

function buildPrompt(task: DispatchTask, config: OneshotConfig): string {
  const lines = [
    'You are being dispatched by the Cockpit dispatch engine (OPS v5).',
    '',
  ]
  if (config.workdir) {
    lines.push('You are working inside this workspace:', config.workdir, '')
  }
  lines.push(
    'Before doing the task, read and follow:',
    '~/workspaces/_shared/agent-protocols/cockpit-wiring.md',
    '',
    `Cockpit task ID: ${task.id}`,
    `Workspace: ${task.workspaceId}`,
    '',
    'Register yourself in Cockpit before execution using your actual harness name,',
    'active model name, and current session/run ID (POST /api/tasks/[id] headers per',
    'the wiring protocol; auth via the COCKPIT_API_TOKEN / CRON_SECRET env var — do',
    'not print its value). Keep Cockpit updated with progress, blockers, artifacts,',
    'and final status. Mark the task Done via the API when complete (To Do tasks',
    'must pass through In Progress first). Do not log secrets.',
    '',
    'Task:',
    task.title,
  )
  if (task.description && typeof task.description === 'string') {
    lines.push('', task.description)
  }
  return lines.join('\n')
}

export const hermesOneshotAdapter: HarnessAdapter = {
  type: 'hermes-oneshot',

  async dispatch(task: DispatchTask, operator: DispatchOperator): Promise<DispatchResult> {
    const config = (operator.dispatchConfig ?? {}) as OneshotConfig
    const command = config.command ?? 'hermes'

    const args: string[] = config.command ? [] : ['chat', '-Q']
    if (config.model) args.push('-m', config.model)
    if (config.toolsets?.length) args.push('-t', config.toolsets.join(','))
    if (config.maxTurns) args.push('--max-turns', String(config.maxTurns))
    if (config.extraArgs?.length) args.push(...config.extraArgs)
    if (!config.command) args.push('-q', buildPrompt(task, config))

    return new Promise<DispatchResult>((resolve) => {
      const child = spawn(command, args, {
        cwd: config.workdir,
        detached: true,
        stdio: 'ignore',
      })
      child.once('spawn', () => {
        child.unref()
        resolve({
          sessionId: `oneshot-pid-${child.pid}`,
          status: 'spawned',
          detail: `${command} spawned (pid ${child.pid}) for task "${task.title}"`,
        })
      })
      child.once('error', (err) => {
        resolve({
          sessionId: 'oneshot-failed',
          status: 'failed',
          detail: `failed to spawn ${command}: ${err.message}`,
        })
      })
    })
  },
}
