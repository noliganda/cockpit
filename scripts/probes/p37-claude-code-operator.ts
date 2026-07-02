/**
 * Probe P3.7 — claude-code operator is unpaused and safely configured.
 *
 * Post Phase 3, claude-code must be: active, on the claude-tmux adapter
 * (registered), with a dispatch target that is NOT the 'cockpit' session (the
 * session the PM/build run lives in — steering it would inject prompts into
 * the orchestrator; spec §10 Q4 decided the PM session is not an operator).
 * Idempotently applies the config first, then asserts it.
 */
import { check, finish } from './_probe-env'

async function main() {
  const { db } = await import('@/lib/db')
  const { operators } = await import('@/lib/db/schema')
  const { getAdapter } = await import('@/lib/dispatch/adapters')
  const { eq } = await import('drizzle-orm')

  // Idempotent apply (this IS the P3.7 change, kept in the probe so re-runs
  // converge): unpause + point at the dedicated dispatch-claude session.
  await db.update(operators)
    .set({
      status: 'active',
      pausedAt: null,
      pauseReason: null,
      dispatchConfig: { workdir: '/Users/agentsmyth/workspaces/dev/cockpit', tmux_session: 'dispatch-claude' },
    })
    .where(eq(operators.id, 'claude-code'))

  const [op] = await db.select().from(operators).where(eq(operators.id, 'claude-code'))
  check('claude-code exists', !!op)
  check('claude-code active', op.status === 'active', op.status)
  check('pause fields cleared', op.pausedAt === null && op.pauseReason === null)
  check('adapter claude-tmux registered', op.adapterType === 'claude-tmux' && !!getAdapter(op.adapterType), String(op.adapterType))
  const config = op.dispatchConfig as { tmux_session?: string }
  check('dispatch target is NOT the cockpit session', !!config.tmux_session && config.tmux_session !== 'cockpit', String(config.tmux_session))
  check('maxConcurrent sane', op.maxConcurrent >= 1, String(op.maxConcurrent))
  finish('probe P3.7')
}

main().catch((err) => { console.error(err); process.exit(1) })
