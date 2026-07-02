/**
 * hermes-delegate adapter — spawn an isolated Hermes subagent run (spec §5.3).
 *
 * The spec's `delegate_task` primitive isn't reachable from Node, so this uses
 * its documented one-shot equivalent: a fresh `hermes chat -Q` process per
 * task, tuned by dispatch_config (model/toolsets/maxTurns). Distinct from
 * hermes-oneshot in intent (clean isolated delegation, typically richer
 * toolsets and higher maxTurns) but shares its spawn + session-id-capture
 * machinery; separating the types keeps operator configs and stale thresholds
 * independently tunable per spec §5.3's adapter list.
 */
import { buildDispatchPrompt } from './prompt'
import { buildOneshotArgs, spawnOneshot, type OneshotConfig } from './hermes-oneshot'
import type { DispatchOperator, DispatchResult, DispatchTask, HarnessAdapter } from './types'

export const hermesDelegateAdapter: HarnessAdapter = {
  type: 'hermes-delegate',
  staleClaimThresholdMs: 5 * 60 * 1000, // delegate runs are bounded one-shots (spec §10 Q3)

  async dispatch(task: DispatchTask, operator: DispatchOperator, _wakeup, context): Promise<DispatchResult> {
    const config = (operator.dispatchConfig ?? {}) as OneshotConfig
    const prompt = buildDispatchPrompt(task, { workdir: config.workdir }, context)
    const { command, args } = buildOneshotArgs(config, prompt)
    return spawnOneshot('delegate', command, args, config, task.id)
  },
}
