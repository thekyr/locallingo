#!/usr/bin/env bash
#
# Build LocalLingo into a Firefox-installable .xpi/.zip.
#
# The archive is created from *inside* the extension directory so that
# manifest.json lands at the root of the zip (Firefox requires this).
#
# Usage:
#   ./build.sh                 # build dist/locallingo-<version>.xpi
#   ./build.sh --lint          # lint with web-ext first (needs web-ext installed)
#   ./build.sh --sign          # build + submit to AMO for signing (needs API keys)
#
set -euo pipefail

SRC_DIR="fx-local-translator"
DIST_DIR="dist"

cd "$(dirname "$0")"

VERSION=$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "$SRC_DIR/manifest.json" \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
OUT="$DIST_DIR/locallingo-${VERSION}.xpi"

mkdir -p "$DIST_DIR"
rm -f "$OUT"

# Optional: lint via Mozilla's web-ext
if [[ "${1:-}" == "--lint" ]] || [[ "${1:-}" == "--sign" ]]; then
  if command -v web-ext >/dev/null 2>&1; then
    web-ext lint --source-dir "$SRC_DIR"
  else
    echo "web-ext not installed — run: npm install -g web-ext" >&2
    exit 1
  fi
fi

# Sign + build via web-ext (produces a signed .xpi from AMO)
if [[ "${1:-}" == "--sign" ]]; then
  : "${AMO_JWT_ISSUER:?set AMO_JWT_ISSUER (from addons.mozilla.org API key)}"
  : "${AMO_JWT_SECRET:?set AMO_JWT_SECRET (from addons.mozilla.org API key)}"
  web-ext sign \
    --source-dir "$SRC_DIR" \
    --artifacts-dir "$DIST_DIR" \
    --channel listed \
    --api-key "$AMO_JWT_ISSUER" \
    --api-secret "$AMO_JWT_SECRET"
  echo "Signed artifact written to $DIST_DIR/"
  exit 0
fi

# Plain build: zip the contents of SRC_DIR with manifest.json at the root.
# Excludes OS/editor cruft.
( cd "$SRC_DIR" && zip -r -FS "../$OUT" . \
    -x "*.DS_Store" -x "*/.git/*" -x "*~" -x ".amo-upload-uuid" >/dev/null )

echo "Built $OUT"
unzip -l "$OUT"
