#!/bin/zsh
# Ensure the persistent `dispatch-claude` tmux session exists and is running
# interactive Claude Code — the target the claude-tmux adapter steers.
#
# Safety shape: the session's pane runs `exec claude …` from a login shell, so
# if Claude Code ever exits, the PANE DIES with it (no shell left underneath
# for a later dispatch paste to execute as commands) and the adapter's
# session-exists check refuses cleanly until this script recreates it.
# Bypass-permissions is deliberate: dispatched briefs must run unattended;
# only bearer-holding actors can queue tasks (the shared-admin trust model).
set -uo pipefail
SESSION="dispatch-claude"
WORKDIR="$HOME/workspaces/dev/cockpit"
LOG_DIR="$HOME/Library/Logs/cockpit-dispatch"
mkdir -p "$LOG_DIR"

command tmux has-session -t "=$SESSION" 2>/dev/null && exit 0

command tmux new-session -d -s "$SESSION" -c "$WORKDIR" \
  "$SHELL -lc 'exec claude --dangerously-skip-permissions'"
echo "$(date '+%F %T') created $SESSION" >> "$LOG_DIR/claude-session.log"

# Walk Claude Code past its startup dialogs (bypass-permissions warning /
# folder trust) until the prompt is ready, then leave it idle.
for i in {1..30}; do
  sleep 3
  PANE=$(command tmux capture-pane -p -t "=$SESSION:" 2>/dev/null || true)
  [[ -z "$PANE" ]] && break
  if echo "$PANE" | grep -qi 'bypass permissions' && echo "$PANE" | grep -qi 'accept'; then
    command tmux send-keys -t "=$SESSION:" '2'; command tmux send-keys -t "=$SESSION:" Enter; continue
  fi
  if echo "$PANE" | grep -qi 'do you trust the files'; then
    command tmux send-keys -t "=$SESSION:" Enter; continue
  fi
  if echo "$PANE" | grep -qE '\? for shortcuts|bypass permissions on'; then
    echo "$(date '+%F %T') $SESSION ready" >> "$LOG_DIR/claude-session.log"
    exit 0
  fi
done
echo "$(date '+%F %T') $SESSION created but readiness not confirmed — check manually (tmux attach -t $SESSION)" >> "$LOG_DIR/claude-session.log"
