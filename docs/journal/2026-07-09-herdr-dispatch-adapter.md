# Dispatch: `herdr` adapter — herdr-native steering (parallel to tmux)

**Date:** 2026-07-09 · **Cockpit task:** 39e5256b · **Commit:** (this) · **Brief:** `_shared/workspace-architecture/dispatch-herdr-adapter-brief.md`

## What shipped

A new dispatch adapter that steers an agent pane through herdr's socket-API CLI, registered alongside the existing adapters. **Additive — `claude-tmux` / `hermes-tmux` / `hermes-oneshot` / `hermes-delegate` are untouched.** Live dispatch keeps running on tmux until this is adopted.

- `lib/dispatch/adapters/herdr-common.ts` — arg-array `spawn('herdr', …)` (no shell): `herdrResolveTarget`, `herdrSendAndSubmit`, `herdrWaitStatus`, `herdrReadVisible`.
- `lib/dispatch/adapters/herdr.ts` — the `herdr` adapter.
- `lib/dispatch/adapters/index.ts` — one registry entry.
- `scripts/probes/e2e/_herdr-smoke.ts` — smoke harness (`verify` / `e2e` / `cleanup`); NOT in the gate (needs a live herdr server).

## Naming decision (Oli, 2026-07-09): transport, not agent

The workspace is going agent-agnostic, so "claude" in an adapter name will rot. **Adapters are named by transport; the agent in the pane is detected at runtime.** herdr already tags each pane's agent (claude/codex/gemini/pi/cursor) — one `herdr` adapter dispatches to any of them, so the brief's proposed `claude-herdr` became **`herdr`**. All identifiers are transport-scoped (`herdrAdapter`, `HerdrConfig`, `sessionId = herdr:<pane>`); `expect_agent` is an optional assertion, never a claude assumption. Existing `claude-*/hermes-*` names stay (live `operator.adapterType` rows point at them); a rename to transport naming is a later deliberate DB migration.

## Why it's better than the tmux adapters

- **No paste-and-pray:** `agent send` writes literal text, a separate `pane send-keys Enter` submits — sidesteps the `[Pasted text #1]`-doesn't-submit failure.
- **Won't clobber a busy agent:** dispatch refuses unless the target `agent_status` is `idle` (this doubles as the recursive-steer guard — an active session reads `working`, never `idle`).
- **Submission is confirmed**, not assumed: after submit it waits (bounded) for `working` AND reads the pane back for the dispatched task id; either confirms. tmux can confirm neither.

### Config (`operator.dispatch_config`)
`herdr_target` (REQUIRED — pane_id like `w5:p1`, terminal_id, or a *unique* agent name; a bare `claude` label is ambiguous across panes), `workdir?`, `expect_agent?`, `submit_verify_timeout_ms?` (default 30000).

## Scope boundary: submission, not completion

`dispatch()` is fire-and-forget by engine contract — blocking until a task *finishes* (30+ min) would stall the poll cycle. Completion still settles through the durable path (`settleDispatchOnTerminal`). Follow-up (separate task): teach stale-claim reclamation to poll herdr `agent-status` as a liveness signal for herdr operators.

## Verification

- `npm run build` clean · `npm run lint` clean · `readiness.ts` resolves adapters generically (`getAdapter`) — `herdr` recognized with no code change.
- **Live `verify` (read-only):** `herdrResolveTarget` parses live panes, carries agent+status, returns null for unknown targets. My parsing code, real server.
- **Live `e2e`:** spawned a throwaway `--no-focus` claude agent via herdr, sent a prompt whose answer is **computed** (`PONG-<a+b>`, never in the prompt), and read `PONG-7931` back — full submit→process→reply round-trip through the adapter's primitives, pane auto-closed, zero residue (back to 7 panes).
- **Known-expected finding:** on a trivial reply the agent passes through `working` faster than the 20s wait observes it (`worked=false`), which is precisely why the adapter gates on working-wait **OR** read-back. A real dispatched task runs long enough that the status wait fires reliably.

## Not done / next

- Adopt in production: point a real agent operator's `adapterType` at `herdr` with a `herdr_target` (kept on tmux this task — no live operator flipped).
- Stale-claim liveness via herdr `agent-status` (above).
- herdr's spawn PATH is minimal — `agent start` needs the **absolute** agent binary as argv[0] (`/opt/homebrew/bin/claude`); noted in the smoke harness.
