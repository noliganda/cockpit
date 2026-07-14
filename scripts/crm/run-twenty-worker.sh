#!/bin/sh
# launchd entrypoint for the Cockpit⇄Twenty worker. launchd has no shell profile,
# so paths are explicit. Resolves TWENTY_OM_API_KEY from the SOPS vault into the
# child's env (never echoed); DATABASE_URL is self-loaded by the worker from
# .env.local. Runs on the Mac Mini only (Twenty is tailnet-only).
set -eu
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-$HOME/.config/sops/age/keys.txt}"
WORKSPACE_SECRETS="${WORKSPACE_SECRETS:-$HOME/workspaces/_shared/secrets.env}"
REPO="$HOME/workspaces/dev/cockpit"

cd "$REPO"

TWENTY_OM_API_KEY="$(sops -d --extract '["TWENTY_OM_API_KEY"]' "$WORKSPACE_SECRETS")"
export TWENTY_OM_API_KEY

# Inbound-only reconcile pass (Twenty → Cockpit); args override (e.g. `--since=48`,
# `--backfill`, `--dry-run`). A legacy mode token is accepted but ignored.
exec "$REPO/node_modules/.bin/tsx" "$REPO/scripts/crm/twenty-worker.ts" "${@:-inbound}"
