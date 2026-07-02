/**
 * hermes-tmux adapter — steer a live Hermes tmux session (spec §5.3, Phase 3).
 *
 * Same steering mechanics as claude-tmux (paste + Enter, arg-array spawns,
 * no shell), targeting a Hermes prompt_toolkit TUI. Best for continuing a
 * session that already has task context. Logged dispatch_method: tmux-steer.
 *
 * dispatch_config params:
 *   tmux_session — REQUIRED: target session name
 *   workdir      — workspace path named in the prompt (informational)
 */
import { buildDispatchPrompt } from './prompt'
import { tmuxSessionExists, tmuxPasteAndSubmit } from './tmux-common'
import type { DispatchOperator, DispatchResult, DispatchTask, HarnessAdapter } from './types'

interface HermesTmuxConfig {
  tmux_session?: string
  workdir?: string
}

export const hermesTmuxAdapter: HarnessAdapter = {
  type: 'hermes-tmux',
  staleClaimThresholdMs: 30 * 60 * 1000, // interactive sessions run long (spec §10 Q3)

  async dispatch(task: DispatchTask, operator: DispatchOperator, _wakeup, context): Promise<DispatchResult> {
    const config = (operator.dispatchConfig ?? {}) as HermesTmuxConfig
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
      detail: `steered Hermes tmux session "${config.tmux_session}" for task "${task.title}"`,
    }
  },
}
