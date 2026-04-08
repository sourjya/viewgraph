#!/usr/bin/env bash
# ci.sh - Run lint + all tests. Exit non-zero on any failure.
#
# Usage:
#   ./scripts/ci.sh
#
# Steps:
#   1. Install dependencies
#   2. Lint (server + extension)
#   3. Run server tests
#   4. Run extension tests
#   5. Build extension
#
# Logs to logs/ci.log

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$ROOT_DIR/logs/ci.log"

mkdir -p "$ROOT_DIR/logs"

echo "=== ViewGraph CI ===" | tee "$LOG_FILE"
echo "Started: $(date -Iseconds)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

FAILED=0

run_step() {
  local name="$1"
  shift
  echo "[ci] $name..." | tee -a "$LOG_FILE"
  if "$@" 2>&1 | tee -a "$LOG_FILE"; then
    echo "[ci] $name - PASS" | tee -a "$LOG_FILE"
  else
    echo "[ci] $name - FAIL" | tee -a "$LOG_FILE"
    FAILED=1
  fi
  echo "" | tee -a "$LOG_FILE"
}

cd "$ROOT_DIR"

# Step 1: Install
run_step "Install dependencies" npm ci

# Step 2: Lint
if [ -f "server/.eslintrc.json" ] || [ -f "server/eslint.config.js" ]; then
  run_step "Lint server" npx eslint server/src/ --no-error-on-unmatched-pattern
fi
if [ -f "extension/.eslintrc.json" ] || [ -f "extension/eslint.config.js" ]; then
  run_step "Lint extension" npx eslint extension/lib/ extension/entrypoints/ --no-error-on-unmatched-pattern
fi

# Step 3: Server tests
run_step "Server tests" npm run test:server

# Step 4: Extension tests
run_step "Extension tests" npm run test:ext

# Step 5: Build extension
run_step "Build extension" npm run build:ext

echo "=== CI Complete ===" | tee -a "$LOG_FILE"
echo "Finished: $(date -Iseconds)" | tee -a "$LOG_FILE"

if [ "$FAILED" -ne 0 ]; then
  echo "[ci] SOME STEPS FAILED. See logs/ci.log for details." | tee -a "$LOG_FILE"
  exit 1
fi

echo "[ci] All steps passed." | tee -a "$LOG_FILE"
