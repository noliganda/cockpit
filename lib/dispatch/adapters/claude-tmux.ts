/**
 * claude-tmux adapter — steer a Claude Code tmux session (spec §5.3, Phase 3).
 *
 * Pastes the cockpit-wiring dispatch prompt into an EXISTING tmux session that
 * is running Claude Code interactively, then submits it. Claude Code
 * self-registers per cockpit-wiring.md §8 and drives the task via the API.
 *
 * Fragile by nature (spec's own caveat): if the session isn't running Claude
 * Code at its prompt, the paste lands somewhere useless. The engine's
 * pre-dispatch session check (tmux session must exist) catches the dead-session
 * case; what's running inside it is the operator config's responsibility.
 *
 * dispatch_config params:
 *   tmux_session — REQUIRED: target session name (never a session the engine
 *                  itself runs in — recursive steering)
 *   workdir      — workspace path named in the prompt (informational)
 */
import { buildDispatchPrompt } from './prompt'
import { tmuxSessionExists, tmuxPasteAndSubmit } from './tmux-common'
import type { DispatchOperator, DispatchResult, DispatchTask, HarnessAdapter } from './types'

interface ClaudeTmuxConfig {
  tmux_session?: string
  workdir?: string
}

export const claudeTmuxAdapter: HarnessAdapter = {
  type: 'claude-tmux',
  staleClaimThresholdMs: 30 * 60 * 1000, // interactive sessions run long (spec §10 Q3)

  async dispatch(task: DispatchTask, operator: DispatchOperator, _wakeup, context): Promise<DispatchResult> {
    const config = (operator.dispatchConfig ?? {}) as ClaudeTmuxConfig
    if (!config.tmux_session) {
      return { sessionId: 'tmux-unconfigured', status: 'failed', detail: `operator "${operator.id}" has no dispatch_config.tmux_session` }
    }
    if (!(await tmuxSessionExists(config.tmux_session))) {
      return { sessionId: 'tmux-missing', status: 'failed', detail: `tmux session "${config.tmux_session}" not found` }
    }

    const prompt = buildDispatchPrompt(task, { workdir: config.workdir }, context)
    const error = await tmuxPasteAndSubmit(config.tmux_session, prompt)
    if (error) {
      return { sessionId: 'tmux-steer-failed', status: 'failed', detail: error }
    }
    return {
      sessionId: `tmux:${config.tmux_session}`,
      status: 'steered',
      detail: `steered Claude Code tmux session "${config.tmux_session}" for task "${task.title}"`,
    }
  },
}
