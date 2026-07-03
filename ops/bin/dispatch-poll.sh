#!/bin/zsh
# Cockpit dispatch poller — curls the local dispatch cycle (the Vercel cron is
# a deliberate no-op; THIS is the real trigger). Run by launchd every 3 min
# (com.cockpit.dispatch-poll). One summary line per run to the log.
set -uo pipefail
REPO="$HOME/workspaces/dev/cockpit"
LOG_DIR="$HOME/Library/Logs/cockpit-dispatch"
mkdir -p "$LOG_DIR"

# CRON_SECRET from the app's own env file; never echoed.
CRON_SECRET=$(grep '^CRON_SECRET=' "$REPO/.env.local" | cut -d= -f2- | tr -d '"' | tr -d "'")
[[ -n "$CRON_SECRET" ]] || { echo "$(date '+%F %T') poll: CRON_SECRET missing from .env.local" >> "$LOG_DIR/poll.log"; exit 1; }

RESULT=$(curl -sS -m 60 -H "Authorization: Bearer $CRON_SECRET" http://localhost:3200/api/cron/dispatch 2>&1 || true)
echo "$(date '+%F %T') $RESULT" >> "$LOG_DIR/poll.log"

# Keep the log bounded (~2000 lines).
if [[ $(wc -l < "$LOG_DIR/poll.log") -gt 4000 ]]; then
  tail -n 2000 "$LOG_DIR/poll.log" > "$LOG_DIR/poll.log.tmp" && mv "$LOG_DIR/poll.log.tmp" "$LOG_DIR/poll.log"
fi
