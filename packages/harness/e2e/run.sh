#!/usr/bin/env bash
# Build the harness UI and the CLI, serve the SPA from the real binary, and
# capture review screenshots with Playwright. Screenshots land in
# e2e/screenshots/ (gitignored) and are never committed.
#
#   packages/harness/e2e/run.sh                 # capture / compare
#   packages/harness/e2e/run.sh --update-snapshots
set -euo pipefail

E2E_DIR=$(cd "$(dirname "$0")" && pwd)
HARNESS_DIR=$(cd "$E2E_DIR/.." && pwd)
ROOT=$(cd "$HARNESS_DIR/../.." && pwd)
PORT=${HARNESS_PORT:-32123}
BASE_URL="http://127.0.0.1:${PORT}"
BIN="$ROOT/bin/contenox"

echo "==> building @contenox/ui"
[ -d "$ROOT/packages/ui/node_modules" ] || (cd "$ROOT/packages/ui" && npm ci --no-audit --no-fund >/dev/null)
(cd "$ROOT/packages/ui" && npm run build >/dev/null)

echo "==> building harness UI (writes runtime/internal/web/harness/dist)"
[ -d "$HARNESS_DIR/node_modules" ] || (cd "$HARNESS_DIR" && npm ci --no-audit --no-fund >/dev/null)
(cd "$HARNESS_DIR" && npm run build >/dev/null)

echo "==> building contenox"
(cd "$ROOT" && CGO_ENABLED=0 go build -o "$BIN" ./cmd/contenox)

echo "==> starting serve on ${BASE_URL} with a throwaway home"
TMP_HOME=$(mktemp -d)
cleanup() {
  [ -n "${SERVE_PID:-}" ] && kill "$SERVE_PID" 2>/dev/null || true
  rm -rf "$TMP_HOME"
}
trap cleanup EXIT
HOME="$TMP_HOME" "$BIN" serve >"$TMP_HOME/serve.log" 2>&1 &
SERVE_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$SERVE_PID" 2>/dev/null; then
    echo "serve exited during startup:" >&2
    tail -20 "$TMP_HOME/serve.log" >&2
    exit 1
  fi
  sleep 0.5
done
curl -fsS "$BASE_URL/health" >/dev/null || {
  echo "serve did not become healthy at $BASE_URL: see the log above" >&2
  tail -20 "$TMP_HOME/serve.log" >&2
  exit 1
}

echo "==> capturing screenshots"
HARNESS_BASE_URL="$BASE_URL" npx --prefix "$HARNESS_DIR" playwright test \
  --config "$E2E_DIR/playwright.config.ts" "$@"

echo "==> screenshots in $E2E_DIR/screenshots"
