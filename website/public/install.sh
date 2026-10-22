#!/usr/bin/env sh
# Contenox Harness installer.
#
#   curl -fsSL https://contenox.com/install.sh | sh
#   CONTENOX_VERSION=v1.0.0 curl -fsSL https://contenox.com/install.sh | sh
#
# Resolution order:
#   1. a prebuilt asset on the latest release of the repository, named
#      contenox-<os>-<arch>;
#   2. `go install` of the module, which is the path that works before any
#      release has been published;
#   3. an explicit error naming the manual options.
set -eu

REPO="contenox/harness"
MODULE="github.com/contenox/harness"
BIN="contenox"
VERSION="${CONTENOX_VERSION:-latest}"

die() { printf 'error: %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

fetch() {
  if have curl; then curl -fsSL --max-time 300 "$1" -o "$2"
  elif have wget; then wget -qO "$2" "$1"
  else die "curl or wget is required"
  fi
}

case "$(uname -s)" in
  Linux)  GOOS=linux ;;
  Darwin) GOOS=darwin ;;
  *)
    die "unsupported OS $(uname -s); on Windows run: irm https://contenox.com/install.ps1 | iex"
    ;;
esac

case "$(uname -m)" in
  x86_64|amd64)  GOARCH=amd64 ;;
  arm64|aarch64) GOARCH=arm64 ;;
  *) die "unsupported architecture $(uname -m)" ;;
esac

# Install beside an existing binary when one is on PATH, otherwise prefer a
# system directory the user can write, and fall back to ~/.local/bin.
DEST=""
if EXISTING="$(command -v "$BIN" 2>/dev/null || true)" && [ -n "$EXISTING" ]; then
  DEST="$(dirname "$EXISTING")"
elif [ -d /usr/local/bin ] && [ -w /usr/local/bin ]; then
  DEST=/usr/local/bin
else
  DEST="$HOME/.local/bin"
  mkdir -p "$DEST" || die "cannot create $DEST"
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

installed=""

# 1. Prebuilt asset from the repository's latest release.
if have curl && have jq; then
  if curl -fsSL --max-time 30 "https://api.github.com/repos/${REPO}/releases/${VERSION}" -o "$TMP.json" 2>/dev/null; then
    URL="$(jq -r --arg n "${BIN}-${GOOS}-${GOARCH}" \
      '.assets[]? | select(.name == $n) | .browser_download_url' "$TMP.json" | head -1)"
    if [ -n "$URL" ] && [ "$URL" != "null" ]; then
      printf 'Downloading %s-%s...\n' "$BIN" "${GOOS}-${GOARCH}"
      fetch "$URL" "$TMP"
      chmod +x "$TMP"
      if [ "$(id -u)" -eq 0 ] || [ -w "$DEST" ]; then
        mv "$TMP" "${DEST}/${BIN}"
      else
        sudo mv "$TMP" "${DEST}/${BIN}"
      fi
      installed="$DEST/${BIN}"
    fi
  fi
  rm -f "$TMP.json"
fi

# 2. Build from source with the Go toolchain. The harness is pure Go, so this
#    needs no C toolchain and produces the same binary.
if [ -z "$installed" ] && have go; then
  GOVER="$(go env GOVERSION 2>/dev/null | sed 's/^go//')"
  case "$GOVER" in
    1.2[5-9]*|1.[3-9][0-9]*) ;;
    *) die "go ${GOVER} is too old; Go 1.25 or newer is required" ;;
  esac
  printf 'Building %s with the Go toolchain (no release asset found)...\n' "$BIN"
  GOBIN="$DEST" go install "${MODULE}/cmd/${BIN}@${VERSION}" \
    || die "go install failed; install Go 1.25+ or download a build from https://github.com/${REPO}/releases"
  installed="$DEST/${BIN}"
fi

[ -n "$installed" ] || die "no release asset for ${GOOS}-${GOARCH} and no Go toolchain found.
Install Go 1.25+ (https://go.dev/dl/) or download a build from https://github.com/${REPO}/releases"

printf '\n\xe2\x9c\x93 %s installed at %s\n\n' "$BIN" "$installed"
printf 'Get started:\n'
printf '  contenox setup        # choose a provider and a model\n'
printf '  contenox init         # mark this repository as a workspace\n'
printf '  contenox "summarise this repository"\n'
printf '  contenox acp          # serve the agent to an ACP editor\n'
