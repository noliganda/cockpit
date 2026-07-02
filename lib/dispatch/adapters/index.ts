/**
 * Adapter registry (spec §5.3). `operator.adapterType` selects the adapter.
 * Phase 2 ships hermes-oneshot only; hermes-delegate / hermes-tmux / claude-tmux
 * arrive in Phase 3. An unregistered type is a readiness blocker, not an error.
 */
import type { HarnessAdapter } from './types'
import { hermesOneshotAdapter } from './hermes-oneshot'

const adapters = new Map<string, HarnessAdapter>([
  [hermesOneshotAdapter.type, hermesOneshotAdapter],
])

export function getAdapter(type: string | null): HarnessAdapter | null {
  if (!type) return null
  return adapters.get(type) ?? null
}

export type { HarnessAdapter, DispatchResult } from './types'
