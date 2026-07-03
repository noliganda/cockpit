#!/bin/zsh
# Install (or reinstall) the Cockpit dispatch host on this machine:
#   1. com.cockpit.dispatch-server — app on :3200 with DISPATCH_ENABLED=true
#   2. com.cockpit.dispatch-poll   — cycle trigger every 3 min
#   3. com.cockpit.dispatch-claude — persistent dispatch-claude tmux session
# Idempotent: unloads existing jobs first. Uninstall with:
#   launchctl unload ~/Library/LaunchAgents/com.cockpit.dispatch-*.plist && rm ~/Library/LaunchAgents/com.cockpit.dispatch-*.plist
set -euo pipefail
REPO="$HOME/workspaces/dev/cockpit"
AGENTS="$HOME/Library/LaunchAgents"
mkdir -p "$AGENTS" "$HOME/Library/Logs/cockpit-dispatch"
chmod +x "$REPO"/ops/bin/*.sh

for job in dispatch-server dispatch-poll dispatch-claude; do
  plist="$AGENTS/com.cockpit.$job.plist"
  launchctl unload "$plist" 2>/dev/null || true
  cp "$REPO/ops/launchd/com.cockpit.$job.plist" "$plist"
  launchctl load "$plist"
  echo "loaded com.cockpit.$job"
done
echo "Dispatch host installed. Watch: tail -f ~/Library/Logs/cockpit-dispatch/poll.log"
