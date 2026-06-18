#!/usr/bin/env bash
# Start Medusa + storefront for local development.
# Uses `next dev` (hot reload) — no rebuild needed after code changes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

free_port() {
  local port=$1
  if lsof -ti :"$port" >/dev/null 2>&1; then
    echo "→ Stopping existing process on port $port"
    lsof -ti :"$port" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

echo "Starting ControlKart dev servers..."

free_port 9000
free_port 3000

cd "$ROOT/apps/medusa"
nohup npx medusa develop > /tmp/medusa-dev.log 2>&1 &
MEDUSA_PID=$!
echo "→ Medusa  (PID $MEDUSA_PID)  http://localhost:9000  log: /tmp/medusa-dev.log"

cd "$ROOT"
nohup pnpm --filter @controlkart/storefront dev > /tmp/storefront-dev.log 2>&1 &
STORE_PID=$!
echo "→ Storefront (PID $STORE_PID)  http://localhost:3000  log: /tmp/storefront-dev.log"

echo ""
echo "Waiting for servers..."
for i in $(seq 1 30); do
  MEDUSA_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/health 2>/dev/null || echo "000")
  STORE_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
  if [ "$MEDUSA_OK" = "200" ] && [ "$STORE_OK" = "200" ]; then
    echo "✓ Both servers ready"
    exit 0
  fi
  sleep 2
done

echo "⚠ Servers may still be starting. Check logs:"
echo "  tail -f /tmp/medusa-dev.log"
echo "  tail -f /tmp/storefront-dev.log"
exit 0
