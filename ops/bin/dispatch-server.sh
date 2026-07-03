#!/bin/zsh
# Cockpit dispatch host server — production build on :3200 with the engine
# capability flag ON. This is the ONLY place DISPATCH_ENABLED is set: the Mini
# has the harness CLIs (hermes, claude, tmux); Vercel never does.
# Managed by launchd (com.cockpit.dispatch-server, KeepAlive) — it rebuilds on
# every (rare) restart so the running server always matches the checked-out code.
set -euo pipefail
cd "$HOME/workspaces/dev/cockpit"

# launchd's login shell loads .zprofile but not .zshrc, where user CLI paths
# usually live — without this, adapter spawns die with `spawn hermes ENOENT`.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
command -v hermes >/dev/null || echo "dispatch-server: WARNING hermes not on PATH — oneshot/delegate dispatches will fail" >&2
command -v tmux   >/dev/null || echo "dispatch-server: WARNING tmux not on PATH — tmux dispatches will fail" >&2

[[ -f .env.local ]] || { echo "dispatch-server: .env.local missing — derive it via _shared/tools/decrypt-env.sh" >&2; exit 1; }

export DISPATCH_ENABLED=true
npm run build
exec npx next start -p 3200
