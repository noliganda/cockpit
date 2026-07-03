/**
 * Shared dispatch prompt (cockpit-wiring.md §8 template, spec §5.3).
 *
 * Every adapter sends the same self-registration contract: the spawned harness
 * reads the wiring protocol, registers its real model/session footprint, keeps
 * Cockpit updated, and completes via the API (To Do must pass through
 * In Progress — the lifecycle rejects a direct jump to Done).
 *
 * needs_artifact support (spec §8 Phase 4): when the engine passes satisfied
 * prerequisite artifacts in the context, they are listed so the dependent run
 * starts from its inputs instead of rediscovering them.
 *
 * Safety (spec §9): env var NAMES only, never values; the prompt is passed to
 * adapters that spawn with arg arrays or send literal tmux keys — no shell.
 */
import type { DispatchContext, DispatchTask } from './types'

export function buildDispatchPrompt(
  task: DispatchTask,
  options: { workdir?: string },
  context?: DispatchContext,
): string {
  const lines = [
    'You are being dispatched by the Cockpit dispatch engine (OPS v5).',
    '',
  ]
  if (options.workdir) {
    lines.push('You are working inside this workspace:', options.workdir, '')
  }
  lines.push(
    'Before doing the task, read and follow:',
    '~/workspaces/_shared/agent-protocols/cockpit-wiring.md',
    '',
    `Cockpit task ID: ${task.id}`,
    `Workspace: ${task.workspaceId}`,
    '',
    'THIS DISPATCH IS YOUR COCKPIT TASK BINDING. Where the kickoff protocol asks',
    'you to bind a task, claim THIS one — never create a new one:',
    `  cockpit-task start -t ${task.id}`,
    `and pass -t ${task.id} on EVERY cockpit-task log/done/block call (other`,
    'sessions run in parallel; the bare current-task pointer is not yours).',
    'The queued brief below is your confirmation — do not wait for a human.',
    '',
    'Register your actual harness name, active model name, and session/run ID',
    '(x-harness-* headers per the wiring protocol; auth via the COCKPIT_API_TOKEN /',
    'CRON_SECRET env var — do not print its value). Keep Cockpit updated with',
    'progress, blockers, artifacts, and final status. Mark the task Done when',
    'complete (To Do tasks must pass through In Progress first). Do not log secrets.',
    '',
    'Task:',
    task.title,
  )
  if (task.description && typeof task.description === 'string') {
    lines.push('', task.description)
  }
  if (context?.artifacts?.length) {
    lines.push(
      '',
      'Prerequisite artifacts (inputs from completed upstream tasks — read these first):',
      ...context.artifacts.map(a => `- ${a.title}: ${a.artifactUrl}`),
    )
  }
  return lines.join('\n')
}
