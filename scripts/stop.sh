#!/usr/bin/env bash
# Stop dev servers on ports 3000 and 9000.
set -euo pipefail

for port in 3000 9000; do
  if lsof -ti :"$port" >/dev/null 2>&1; then
    echo "→ Stopping port $port"
    lsof -ti :"$port" | xargs kill -9 2>/dev/null || true
  else
    echo "→ Port $port already free"
  fi
done

echo "✓ Done"
