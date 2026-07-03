#!/bin/zsh
# Cockpit dispatch host server — production build on :3200 with the engine
# capability flag ON. This is the ONLY place DISPATCH_ENABLED is set: the Mini
# has the harness CLIs (hermes, claude, tmux); Vercel never does.
# Managed by launchd (com.cockpit.dispatch-server, KeepAlive) — it rebuilds on
# every (rare) restart so the running server always matches the checked-out code.
set -euo pipefail
cd "$HOME/workspaces/dev/cockpit"

[[ -f .env.local ]] || { echo "dispatch-server: .env.local missing — derive it via _shared/tools/decrypt-env.sh" >&2; exit 1; }

export DISPATCH_ENABLED=true
npm run build
exec npx next start -p 3200
