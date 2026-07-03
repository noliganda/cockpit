#!/bin/sh
# Dispatch-engine verification gate: build + lint + every probe against a
# production server on :3100 (next start shares .next with build, so the
# server boots AFTER the build and dies before the script exits — running it
# alongside `npm run dev` on :3000 would race the .next directory).
# Usage: sh scripts/probes/run-all.sh   (from the repo root)
set -e
cd "$(dirname "$0")/../.."

echo "── build ──"
npm run build 2>&1 | grep -E '✓|error|Error' | head -5
echo "── lint ──"
npm run lint 2>&1 | grep -vE 'next lint|deprecated|create-next-app|codemod|^$' | head -10

echo "── server :3100 ──"
# Own the port: a stale server from a manual probe run would silently serve an
# OLD build to every probe (EADDRINUSE on our start goes unseen otherwise).
lsof -ti :3100 | xargs kill 2>/dev/null || true
sleep 1
PORT=3100 nohup npx next start -p 3100 >/tmp/cockpit-probe-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
i=0
until curl -s -o /dev/null http://localhost:3100/api/workspaces 2>/dev/null; do
  i=$((i+1)); [ $i -gt 30 ] && { echo "server failed to start"; exit 1; }
  sleep 1
done

FAILED=0
for probe in scripts/probes/[a-z0-9]*.ts; do
  name=$(basename "$probe" .ts)
  case "$name" in _*) continue;; esac
  if BASE_URL=http://localhost:3100 npx tsx "$probe" >/tmp/probe-$name.log 2>&1; then
    echo "green  $name"
  else
    echo "RED    $name  (see /tmp/probe-$name.log)"
    FAILED=1
  fi
done
exit $FAILED
