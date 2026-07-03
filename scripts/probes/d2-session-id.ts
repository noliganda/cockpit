/**
 * Probe D2 — hermes-oneshot captures the real hermes session id.
 *
 * `hermes chat -Q` prints `session_id: <id>` on stdout. The adapter must store
 * that id (not the pid placeholder) when it appears within the wait window,
 * fall back to the pid form when it doesn't, and report failed spawns.
 * Uses fake hermes binaries — no DB rows, no real CLI.
 */
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { check, finish } from './_probe-env'

async function main() {
  const { spawnOneshot, buildOneshotArgs } = await import('@/lib/dispatch/adapters/hermes-oneshot')
  const { buildDispatchPrompt } = await import('@/lib/dispatch/adapters/prompt')

  const dir = mkdtempSync(join(tmpdir(), 'probe-d2-'))
  try {
    const chatty = join(dir, 'fake-hermes-chatty')
    writeFileSync(chatty, '#!/bin/sh\nsleep 0.4\necho "session_id: hermes-test-42"\nsleep 0.2\n')
    chmodSync(chatty, 0o755)
    const silent = join(dir, 'fake-hermes-silent')
    writeFileSync(silent, '#!/bin/sh\nsleep 0.2\n')
    chmodSync(silent, 0o755)

    const captured = await spawnOneshot('oneshot', chatty, [], { sessionIdWaitMs: 4000 }, 'probe-task-1')
    check('real session id captured', captured.sessionId === 'hermes-test-42', JSON.stringify(captured))
    check('captured detail names the session', captured.detail.includes('hermes-test-42'), captured.detail)

    const fallback = await spawnOneshot('oneshot', silent, [], { sessionIdWaitMs: 800 }, 'probe-task-2')
    check('silent binary falls back to pid id', /^oneshot-pid-\d+$/.test(fallback.sessionId), JSON.stringify(fallback))

    const failed = await spawnOneshot('oneshot', join(dir, 'does-not-exist'), [], { sessionIdWaitMs: 100 }, 'probe-task-3')
    check('missing binary reports failed', failed.status === 'failed', JSON.stringify(failed))

    // Arg/prompt shape for the real CLI path (no command override).
    const prompt = buildDispatchPrompt(
      { id: 'task-xyz', workspaceId: 'personal', title: 'Probe title', description: null } as never,
      { workdir: '/tmp/w' },
    )
    const { command, args } = buildOneshotArgs({ model: 'glm-5.2', toolsets: ['terminal', 'file'] }, prompt)
    check('real CLI invocation shape', command === 'hermes'
      && args[0] === 'chat' && args[1] === '-Q'
      && args.includes('-m') && args.includes('glm-5.2')
      && args[args.length - 2] === '-q' && args[args.length - 1] === prompt,
    JSON.stringify(args.slice(0, 8)))
    check('prompt carries task id + wiring protocol', prompt.includes('task-xyz') && prompt.includes('cockpit-wiring.md'))
    check('prompt binds THIS task explicitly (anti-duplicate: start -t + -t on every call)',
      prompt.includes('cockpit-task start -t task-xyz') && prompt.includes('never create a new one'),
      'dispatched agents must claim the given task, not kickoff-create a duplicate')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  finish('probe D2')
}

main().catch((err) => { console.error(err); process.exit(1) })
