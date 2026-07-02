/**
 * Probe P3.1/P3.2/P3.3 — claude-tmux, hermes-tmux, hermes-delegate adapters.
 *
 * tmux legs: dispatch into throwaway probe sessions running `cat >> file`.
 * cat receives exactly the bytes the pane was fed, so the file proves the
 * prompt arrives complete AND uninterpreted: `$(...)`, backticks and quotes
 * must land literally and execute nothing. Missing-session and unconfigured
 * paths must fail cleanly. No DB rows; fabricated task/operator objects.
 *
 * delegate leg: reuses the oneshot spawn machinery — assert the arg shape and
 * session-id capture through a fake hermes binary.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { check, finish } from './_probe-env'

const INJECTION = 'Task with $(touch /tmp/probe-p3-pwned) `touch /tmp/probe-p3-pwned2` \'; touch /tmp/probe-p3-pwned3\' "double"'

function tmux(...args: string[]) {
  return spawnSync('tmux', args, { encoding: 'utf8' })
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function fabricateTask(dir: string): never {
  return {
    id: 'probe-p3-task',
    workspaceId: 'personal',
    title: INJECTION,
    description: `multi-line description\nsecond line for ${dir}`,
  } as never
}

function fabricateOperator(id: string, dispatchConfig: object): never {
  return { id, dispatchConfig } as never
}

async function main() {
  const { claudeTmuxAdapter } = await import('@/lib/dispatch/adapters/claude-tmux')
  const { hermesTmuxAdapter } = await import('@/lib/dispatch/adapters/hermes-tmux')
  const { hermesDelegateAdapter } = await import('@/lib/dispatch/adapters/hermes-delegate')

  const dir = mkdtempSync(join(tmpdir(), 'probe-p3-'))
  const sessions: string[] = []
  for (const f of ['/tmp/probe-p3-pwned', '/tmp/probe-p3-pwned2', '/tmp/probe-p3-pwned3']) rmSync(f, { force: true })

  try {
    for (const [label, adapter] of [['claude-tmux', claudeTmuxAdapter], ['hermes-tmux', hermesTmuxAdapter]] as const) {
      const session = `probe-${label}-${process.pid}`
      const sink = join(dir, `${label}.txt`)
      const created = tmux('new-session', '-d', '-s', session, `cat >> ${JSON.stringify(sink)}`)
      check(`${label}: probe session created`, created.status === 0, created.stderr)
      sessions.push(session)

      const result = await adapter.dispatch(
        fabricateTask(dir),
        fabricateOperator(`probe-${label}-op`, { tmux_session: session, workdir: dir }),
        {} as never,
      )
      check(`${label}: dispatch reports steered`, result.status === 'steered', JSON.stringify(result))
      check(`${label}: sessionId names the session`, result.sessionId === `tmux:${session}`, result.sessionId)

      await sleep(800) // let the pane flush through cat
      const received = existsSync(sink) ? readFileSync(sink, 'utf8') : ''
      check(`${label}: full prompt delivered`, received.includes('probe-p3-task') && received.includes('cockpit-wiring.md'), `${received.length} bytes`)
      check(`${label}: injection strings literal`, received.includes('$(touch /tmp/probe-p3-pwned)') && received.includes('`touch /tmp/probe-p3-pwned2`'))
      check(`${label}: multi-line description intact`, received.includes('second line for'))

      const missing = await adapter.dispatch(
        fabricateTask(dir),
        fabricateOperator('probe-op', { tmux_session: `nonexistent-${process.pid}` }),
        {} as never,
      )
      check(`${label}: missing session fails`, missing.status === 'failed', missing.detail)
      const unconfigured = await adapter.dispatch(fabricateTask(dir), fabricateOperator('probe-op', {}), {} as never)
      check(`${label}: unconfigured fails`, unconfigured.status === 'failed', unconfigured.detail)
    }

    check('no shell execution happened',
      !existsSync('/tmp/probe-p3-pwned') && !existsSync('/tmp/probe-p3-pwned2') && !existsSync('/tmp/probe-p3-pwned3'))

    // hermes-delegate: fake hermes captures argv and prints a session id.
    const fake = join(dir, 'fake-hermes')
    const argvFile = join(dir, 'argv.txt')
    writeFileSync(fake, `#!/bin/sh\nprintf '%s\\n' "$@" > ${JSON.stringify(argvFile)}\necho "session_id: hermes-deleg-123"\n`)
    chmodSync(fake, 0o755)
    // command override skips the hermes CLI arg scaffold, so exercise the real
    // arg shape via buildOneshotArgs (already probed in D2) and the spawn via
    // a config that mimics it with extraArgs.
    const delegate = await hermesDelegateAdapter.dispatch(
      fabricateTask(dir),
      fabricateOperator('probe-delegate-op', { command: fake, extraArgs: ['chat', '-Q', '-m', 'glm-5.2'], sessionIdWaitMs: 3000 }),
      {} as never,
    )
    check('delegate: session id captured', delegate.sessionId === 'hermes-deleg-123', JSON.stringify(delegate))
    const argv = existsSync(argvFile) ? readFileSync(argvFile, 'utf8') : ''
    check('delegate: child received delegate args', argv.includes('chat') && argv.includes('glm-5.2'), argv.split('\n').slice(0, 4).join(' '))
    check('delegate: stale threshold is 5 min', hermesDelegateAdapter.staleClaimThresholdMs === 5 * 60 * 1000)
    check('tmux adapters stale threshold is 30 min',
      claudeTmuxAdapter.staleClaimThresholdMs === 30 * 60 * 1000 && hermesTmuxAdapter.staleClaimThresholdMs === 30 * 60 * 1000)
  } finally {
    for (const s of sessions) tmux('kill-session', '-t', `=${s}`)
    for (const f of ['/tmp/probe-p3-pwned', '/tmp/probe-p3-pwned2', '/tmp/probe-p3-pwned3']) rmSync(f, { force: true })
    rmSync(dir, { recursive: true, force: true })
    const leftover = tmux('ls').stdout ?? ''
    check('probe tmux sessions cleaned up', !leftover.includes(`probe-claude-tmux-${process.pid}`) && !leftover.includes(`probe-hermes-tmux-${process.pid}`))
  }
  finish('probe P3 adapters')
}

main().catch((err) => { console.error(err); process.exit(1) })
