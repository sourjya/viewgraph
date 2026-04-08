#!/usr/bin/env bash
# build-extension.sh - Build the ViewGraph extension for Chrome and/or Firefox.
#
# Usage:
#   ./scripts/build-extension.sh          # build Chrome (default)
#   ./scripts/build-extension.sh chrome   # build Chrome
#   ./scripts/build-extension.sh firefox  # build Firefox
#   ./scripts/build-extension.sh all      # build both
#
# Output goes to extension/.output/<target>/
# Logs to logs/build_extension.log

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$ROOT_DIR/logs/build_extension.log"

mkdir -p "$ROOT_DIR/logs"

TARGET="${1:-chrome}"

build_target() {
  local target="$1"
  echo "[build] Building extension for $target..."
  cd "$ROOT_DIR/extension"

  if [ "$target" = "firefox" ]; then
    npx wxt build --browser firefox 2>&1 | tee -a "$LOG_FILE"
  else
    npx wxt build 2>&1 | tee -a "$LOG_FILE"
  fi

  echo "[build] $target build complete. Output: extension/.output/"
}

echo "=== ViewGraph Extension Build ===" | tee "$LOG_FILE"
echo "Started: $(date -Iseconds)" | tee -a "$LOG_FILE"

case "$TARGET" in
  chrome)
    build_target chrome
    ;;
  firefox)
    build_target firefox
    ;;
  all)
    build_target chrome
    build_target firefox
    ;;
  *)
    echo "Usage: $0 [chrome|firefox|all]" >&2
    exit 1
    ;;
esac

echo "[build] Done." | tee -a "$LOG_FILE"
