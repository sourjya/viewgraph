#!/usr/bin/env bash
# Build the ViewGraph browser extension.
# Logs to both screen and logs/extension_build.log.
# Usage: ./scripts/extension-build.sh [chrome|firefox] (default: chrome)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/extension_build.log"
EXT_DIR="$PROJECT_DIR/extension"
TARGET="${1:-chrome}"

mkdir -p "$LOG_DIR"

echo "[viewgraph] Building extension for $TARGET..."

if [ "$TARGET" = "firefox" ]; then
  (cd "$EXT_DIR" && npm run build:firefox) 2>&1 | tee -a "$LOG_FILE"
  OUTPUT_DIR="$EXT_DIR/.output/firefox-mv3"
else
  (cd "$EXT_DIR" && npm run build) 2>&1 | tee -a "$LOG_FILE"
  OUTPUT_DIR="$EXT_DIR/.output/chrome-mv3"
fi

echo "[viewgraph] $(date '+%Y-%m-%d %H:%M:%S') - Extension built for $TARGET" | tee -a "$LOG_FILE"
echo "[viewgraph] Output: $OUTPUT_DIR"
echo "[viewgraph] Reload in browser to pick up changes."
