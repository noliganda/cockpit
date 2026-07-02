/**
 * Harness adapter contract (dispatch engine Phase 2, spec §5.3).
 *
 * An adapter translates a claimed task into a running harness: spawn a process,
 * steer a tmux session, etc. Adapters run ONLY on a host that has the target
 * harness installed (the Mini) — the deployed Vercel app never executes them
 * because the whole dispatch cycle is gated by DISPATCH_ENABLED.
 */
import type { tasks, operators, agentWakeupRequests } from '@/lib/db/schema'

export type DispatchTask = typeof tasks.$inferSelect
export type DispatchOperator = typeof operators.$inferSelect
export type DispatchWakeup = typeof agentWakeupRequests.$inferSelect

export interface DispatchResult {
  /** The harness's own session/run identifier (best-effort for fire-and-forget). */
  sessionId: string
  status: 'spawned' | 'steered' | 'failed'
  detail: string
}

export interface HarnessAdapter {
  type: string
  dispatch(
    task: DispatchTask,
    operator: DispatchOperator,
    wakeup: DispatchWakeup,
  ): Promise<DispatchResult>
}
