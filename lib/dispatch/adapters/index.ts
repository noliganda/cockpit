/**
 * Adapter registry (spec §5.3). `operator.adapterType` selects the adapter.
 * All four spec adapters are registered (Phase 3). An unregistered type is a
 * readiness blocker, not an error.
 */
import type { HarnessAdapter } from './types'
import { hermesOneshotAdapter } from './hermes-oneshot'
import { hermesDelegateAdapter } from './hermes-delegate'
import { hermesTmuxAdapter } from './hermes-tmux'
import { claudeTmuxAdapter } from './claude-tmux'

const adapters = new Map<string, HarnessAdapter>([
  [hermesOneshotAdapter.type, hermesOneshotAdapter],
  [hermesDelegateAdapter.type, hermesDelegateAdapter],
  [hermesTmuxAdapter.type, hermesTmuxAdapter],
  [claudeTmuxAdapter.type, claudeTmuxAdapter],
])

export function getAdapter(type: string | null): HarnessAdapter | null {
  if (!type) return null
  return adapters.get(type) ?? null
}

export function listAdapters(): HarnessAdapter[] {
  return [...adapters.values()]
}

export type { HarnessAdapter, DispatchResult, DispatchContext } from './types'
