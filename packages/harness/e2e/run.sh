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

echo "==> seeding a throwaway home with a scripted backend"
TMP_HOME=$(mktemp -d)
WORK_DIR="$TMP_HOME/work"
mkdir -p "$WORK_DIR"
cleanup() {
  [ -n "${SERVE_PID:-}" ] && kill "$SERVE_PID" 2>/dev/null || true
  rm -rf "$TMP_HOME"
}
trap cleanup EXIT

# A configured model is what keeps the SPA out of its first-run setup wizard, so
# the capture shows the real surfaces instead of ten copies of the onboarding
# screen. The scripted-test backend replays a dialog: no model, GPU, key or
# network is involved, and the replies are deterministic, so the screenshots are
# stable across machines. The seeding conversation gives /chats and /chat real
# content to render.
DIALOG="$TMP_HOME/dialog.json"
cat > "$DIALOG" <<'JSON'
{
  "model": "scripted-ui",
  "turns": [
    { "text": "general" },
    { "text": "Welcome to Contenox. This reply is replayed from the screenshot suite's scripted backend, so every capture is deterministic." },
    { "text": "general" },
    { "text": "Chains, sessions and approvals are stored in SQLite; this session was seeded by the e2e screenshot harness." },
    { "text": "general" },
    { "text": "A third scripted turn, kept in reserve for the title and recovery calls a chain may make." }
  ]
}
JSON

(
  cd "$WORK_DIR"
  export HOME="$TMP_HOME"
  "$BIN" init >/dev/null
  # `init` registers the local llama/openvino backends for a modeld install;
  # this build ships no local inference, and the capture should show the state a
  # configured user actually has, not two rows the runtime reports as errors.
  "$BIN" backend remove llama >/dev/null 2>&1 || true
  "$BIN" backend remove openvino >/dev/null 2>&1 || true
  "$BIN" config set update-check false >/dev/null
  "$BIN" backend add scripted --type scripted-test --url "$DIALOG" >/dev/null
  "$BIN" config set default-provider scripted-test >/dev/null
  "$BIN" config set default-model scripted-ui >/dev/null
)

# A workspace with a little content, so the workbench capture shows a real tree
# and a preview rather than an empty pane. These are the files `/api/files`
# serves for the session's cwd.
mkdir -p "$WORK_DIR/src"
cat > "$WORK_DIR/README.md" <<'MARKDOWN'
# Screenshot workspace

This file is served by the runtime's `/files` API and previewed by the
library's workbench. It exists so the screenshot suite has something to show.
MARKDOWN
cat > "$WORK_DIR/notes.txt" <<'TEXT'
Release checklist
- backends reachable
- scripted dialog seeded
- workbench preview open
TEXT
cat > "$WORK_DIR/src/main.ts" <<'TS'
export function greet(name: string): string {
  return `hello, ${name}`;
}
TS

# The SPA's session sidebar is fed by the ACP surface (session/list), not by the
# CLI's own store, so the capture seeds the conversation over ACP the way an
# editor would; a `contenox "<prompt>"` session would not appear there.
WORKSPACE_ID=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["id"])' \
  "$WORK_DIR/.contenox/workspace.id" 2>/dev/null || true)
HOME="$TMP_HOME" python3 "$E2E_DIR/seed_acp_session.py" "$BIN" "$WORK_DIR" "$WORKSPACE_ID" || {
  echo "warning: could not seed an ACP session; the chat surfaces will render empty" >&2
}

if curl -fsS --max-time 1 "$BASE_URL/health" >/dev/null 2>&1; then
  echo "another process already answers at $BASE_URL — refusing to capture against it" >&2
  exit 1
fi

echo "==> starting serve on ${BASE_URL}"
cd "$WORK_DIR"
HOME="$TMP_HOME" "$BIN" serve >"$TMP_HOME/serve.log" 2>&1 &
SERVE_PID=$!
cd "$ROOT"

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
