/**
 * Shared tmux steering for the claude-tmux / hermes-tmux adapters (spec §5.3).
 *
 * Safety (spec §9): every tmux invocation is an arg-array spawn — no shell,
 * no interpolation. The prompt travels via `load-buffer` from stdin and
 * `paste-buffer`, so the target TUI receives it as literal pasted bytes
 * (multi-line prompts don't submit early the way per-line send-keys would);
 * Enter is sent as a separate key event. Session names come from operator
 * dispatch_config (operator-controlled, never task-controlled).
 */
import { spawn } from 'node:child_process'

interface TmuxRun {
  code: number
  stderr: string
}

function runTmux(args: string[], stdin?: string): Promise<TmuxRun> {
  return new Promise((resolve) => {
    const child = spawn('tmux', args, { stdio: [stdin === undefined ? 'ignore' : 'pipe', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr?.on('data', (d) => { stderr += String(d) })
    child.once('error', (err) => resolve({ code: 127, stderr: err.message }))
    child.once('close', (code) => resolve({ code: code ?? 1, stderr }))
    if (stdin !== undefined) {
      child.stdin!.end(stdin)
    }
  })
}

export async function tmuxSessionExists(session: string): Promise<boolean> {
  return (await runTmux(['has-session', '-t', `=${session}`])).code === 0
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Paste `text` into the session's active pane and submit it with Enter.
 * Returns an error string, or null on success.
 */
export async function tmuxPasteAndSubmit(session: string, text: string): Promise<string | null> {
  // `=name:` = exact session match resolving to its active window/pane
  // (bare `=name` is a target-SESSION and is rejected where a pane is needed).
  const target = `=${session}:`
  const load = await runTmux(['load-buffer', '-b', 'cockpit-dispatch', '-'], text)
  if (load.code !== 0) return `tmux load-buffer failed: ${load.stderr.trim()}`
  const paste = await runTmux(['paste-buffer', '-d', '-p', '-b', 'cockpit-dispatch', '-t', target])
  if (paste.code !== 0) return `tmux paste-buffer failed: ${paste.stderr.trim()}`
  // Let the TUI ingest the paste before submitting it.
  await sleep(400)
  const enter = await runTmux(['send-keys', '-t', target, 'Enter'])
  if (enter.code !== 0) return `tmux send-keys Enter failed: ${enter.stderr.trim()}`
  return null
}
