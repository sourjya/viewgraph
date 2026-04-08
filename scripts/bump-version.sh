#!/usr/bin/env bash
# bump-version.sh - Bump version across all package.json files.
#
# Usage:
#   ./scripts/bump-version.sh 0.2.0
#
# Updates version in:
#   - package.json (root)
#   - server/package.json
#   - extension/package.json
#
# Logs to logs/bump_version.log

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$ROOT_DIR/logs/bump_version.log"

mkdir -p "$ROOT_DIR/logs"

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>" >&2
  echo "Example: $0 0.2.0" >&2
  exit 1
fi

VERSION="$1"

# Validate semver format
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Error: Version must be semver (e.g., 0.2.0)" >&2
  exit 1
fi

echo "=== Version Bump: $VERSION ===" | tee "$LOG_FILE"

# Update each package.json using node for safe JSON manipulation
for pkg in "$ROOT_DIR/package.json" "$ROOT_DIR/server/package.json" "$ROOT_DIR/extension/package.json"; do
  if [ -f "$pkg" ]; then
    node -e "
      const fs = require('fs');
      const p = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
      const old = p.version;
      p.version = '$VERSION';
      fs.writeFileSync('$pkg', JSON.stringify(p, null, 2) + '\n');
      console.log('  ' + '$pkg'.replace('$ROOT_DIR/', '') + ': ' + old + ' -> $VERSION');
    " 2>&1 | tee -a "$LOG_FILE"
  fi
done

echo "[bump] Done. Run tests before committing." | tee -a "$LOG_FILE"
