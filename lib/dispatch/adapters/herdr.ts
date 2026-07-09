/**
 * herdr adapter — steer an agent pane via herdr's socket-API CLI (spec §5.3).
 *
 * Parallel to the claude-tmux / hermes-tmux adapters and a strict upgrade on
 * them: instead of paste-and-pray, it (1) refuses to inject into a busy agent,
 * (2) submits literal-text + Enter (no `[Pasted text #1]` fragility), and
 * (3) confirms submission from the agent's own status + a read-back of the
 * dispatched task id — signals tmux cannot provide.
 *
 * AGENT-AGNOSTIC by design: herdr detects whatever harness runs in the pane
 * (claude/codex/gemini/…). This adapter is named for the transport, not a
 * harness; `expect_agent` is an OPTIONAL assertion, not a claude assumption.
 *
 * Completion is NOT gated here. `dispatch()` runs inside the poll cycle and is
 * fire-and-forget by contract (spec §5.3) — blocking until a task *finishes*
 * would stall the whole cycle. Task completion still settles through the
 * durable path (settleDispatchOnTerminal). What we gate on is *submission*.
 * Teaching stale-claim reclamation to poll herdr agent-status as a liveness
 * signal is a deliberate follow-up, not this task.
 *
 * dispatch_config params:
 *   herdr_target             — REQUIRED: pane_id (e.g. "w5:p1"), terminal_id, or
 *                              a UNIQUE agent name. A bare agent-type label
 *                              ("claude") is ambiguous across panes — don't use it.
 *   workdir                  — workspace path named in the prompt (informational)
 *   expect_agent             — optional: fail unless the detected agent matches
 *                              (e.g. "claude"); default accepts any agent
 *   submit_verify_timeout_ms — optional: bounded wait for `working` after submit
 *                              (default 30000)
 */
import { buildDispatchPrompt } from './prompt'
import { herdrResolveTarget, herdrSendAndSubmit, herdrWaitStatus, herdrReadVisible } from './herdr-common'
import type { DispatchOperator, DispatchResult, DispatchTask, HarnessAdapter } from './types'

interface HerdrConfig {
  herdr_target?: string
  workdir?: string
  expect_agent?: string
  submit_verify_timeout_ms?: number
}

const DEFAULT_SUBMIT_VERIFY_MS = 30_000

export const herdrAdapter: HarnessAdapter = {
  type: 'herdr',
  staleClaimThresholdMs: 30 * 60 * 1000, // interactive agent sessions run long (spec §10 Q3)

  async dispatch(task: DispatchTask, operator: DispatchOperator, _wakeup, context): Promise<DispatchResult> {
    const config = (operator.dispatchConfig ?? {}) as HerdrConfig
    if (!config.herdr_target) {
      return { sessionId: 'herdr-unconfigured', status: 'failed', detail: `operator "${operator.id}" has no dispatch_config.herdr_target` }
    }

    const info = await herdrResolveTarget(config.herdr_target)
    if (!info) {
      return { sessionId: 'herdr-missing', status: 'failed', detail: `herdr target "${config.herdr_target}" not found (no agent pane for it)` }
    }

    // Precondition: only inject into an IDLE agent. This both avoids clobbering
    // a working agent's input and doubles as the recursive-steer guard — an
    // active session (including the one that might run the engine) reads as
    // 'working', never 'idle'.
    if (info.agentStatus !== 'idle') {
      return {
        sessionId: `herdr:${info.paneId}`,
        status: 'failed',
        detail: `herdr target "${config.herdr_target}" (pane ${info.paneId}) is "${info.agentStatus}", not idle — not steering a busy agent`,
      }
    }

    if (config.expect_agent && info.agent !== config.expect_agent) {
      return {
        sessionId: `herdr:${info.paneId}`,
        status: 'failed',
        detail: `herdr target "${config.herdr_target}" runs agent "${info.agent ?? 'none'}", expected "${config.expect_agent}"`,
      }
    }

    const prompt = buildDispatchPrompt(task, { workdir: config.workdir }, context)
    const sendError = await herdrSendAndSubmit(info.paneId, prompt)
    if (sendError) {
      return { sessionId: `herdr:${info.paneId}`, status: 'failed', detail: sendError }
    }

    // Confirm submission: the agent should transition idle → working, and the
    // dispatched task id should appear in the pane. Either is sufficient proof
    // the prompt landed; a fast agent can leave `working` before we observe it,
    // so the read-back backstops the status wait.
    const timeoutMs = config.submit_verify_timeout_ms ?? DEFAULT_SUBMIT_VERIFY_MS
    const startedWorking = await herdrWaitStatus(info.paneId, 'working', timeoutMs)
    const visible = await herdrReadVisible(info.paneId)
    const taskIdLanded = visible.includes(task.id)

    if (!startedWorking && !taskIdLanded) {
      return {
        sessionId: `herdr:${info.paneId}`,
        status: 'failed',
        detail: `submitted to pane ${info.paneId} but saw no working status within ${timeoutMs}ms and task id not visible — prompt may not have submitted`,
      }
    }

    const signal = startedWorking ? 'agent went working' : 'task id visible (agent already idle)'
    return {
      sessionId: `herdr:${info.paneId}`,
      status: 'steered',
      detail: `steered herdr agent "${info.agent ?? 'unknown'}" in pane ${info.paneId} for task "${task.title}" (${signal})`,
    }
  },
}
