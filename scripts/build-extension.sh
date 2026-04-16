#!/usr/bin/env bash
# build-extension.sh - Build ViewGraph extension for Chrome and Firefox, package as ZIPs.
#
# Usage:
#   ./scripts/build-extension.sh          # build both + package ZIPs
#   ./scripts/build-extension.sh chrome   # Chrome only
#   ./scripts/build-extension.sh firefox  # Firefox only
#
# Output:
#   extension/.output/chrome-mv3/           Chrome unpacked
#   extension/.output/firefox-mv2/          Firefox unpacked
#   extension/.output/viewgraph-chrome-VERSION.zip
#   extension/.output/viewgraph-firefox-VERSION.zip
#
# Logs to logs/build_extension.log

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$ROOT_DIR/logs/build_extension.log"
EXT_DIR="$ROOT_DIR/extension"

mkdir -p "$ROOT_DIR/logs"

# Read version from extension/package.json
VERSION=$(node -e "console.log(require('$EXT_DIR/package.json').version)")
TARGET="${1:-all}"

build_chrome() {
  echo "[build] Building Chrome extension v$VERSION..."
  cd "$EXT_DIR"
  npx wxt build 2>&1 | tee -a "$LOG_FILE"

  # Package ZIP
  cd "$EXT_DIR/.output/chrome-mv3"
  zip -r "../viewgraph-chrome-${VERSION}.zip" . -x "*.DS_Store" 2>&1 | tail -1
  echo "[build] Chrome ZIP: extension/.output/viewgraph-chrome-${VERSION}.zip"
}

build_firefox() {
  echo "[build] Building Firefox extension v$VERSION..."
  cd "$EXT_DIR"
  npx wxt build --browser firefox 2>&1 | tee -a "$LOG_FILE"

  # Package ZIP
  local FF_DIR
  if [ -d "$EXT_DIR/.output/firefox-mv2" ]; then
    FF_DIR="$EXT_DIR/.output/firefox-mv2"
  else
    FF_DIR="$EXT_DIR/.output/firefox-mv3"
  fi
  cd "$FF_DIR"
  zip -r "$EXT_DIR/.output/viewgraph-firefox-${VERSION}.zip" . -x "*.DS_Store" 2>&1 | tail -1
  echo "[build] Firefox ZIP: extension/.output/viewgraph-firefox-${VERSION}.zip"
}

echo "" | tee "$LOG_FILE"
echo -e "  \033[38;5;99m┌──────────────────────────────────────────┐\033[0m" | tee -a "$LOG_FILE"
echo -e "  \033[38;5;99m│\033[0m  \033[1m\033[38;5;141m</>\033[0m  \033[1mViewGraph Build\033[0m \033[38;5;245mv${VERSION}\033[0m" | tee -a "$LOG_FILE"
echo -e "  \033[38;5;99m│\033[0m  \033[38;5;245mExtension packager for Chrome + Firefox\033[0m" | tee -a "$LOG_FILE"
echo -e "  \033[38;5;99m└──────────────────────────────────────────┘\033[0m" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Started: $(date -Iseconds)" | tee -a "$LOG_FILE"

case "$TARGET" in
  chrome)
    build_chrome
    ;;
  firefox)
    build_firefox
    ;;
  all)
    build_chrome
    echo ""
    build_firefox
    ;;
  *)
    echo "Usage: $0 [chrome|firefox|all]" >&2
    exit 1
    ;;
esac

echo "" | tee -a "$LOG_FILE"
echo "[build] Done. Version: $VERSION" | tee -a "$LOG_FILE"
echo "[build] ZIPs ready for upload:" | tee -a "$LOG_FILE"
ls -la "$EXT_DIR/.output"/viewgraph-*-${VERSION}.zip 2>/dev/null | tee -a "$LOG_FILE"
