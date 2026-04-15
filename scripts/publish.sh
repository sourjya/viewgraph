#!/bin/bash
# Publish all ViewGraph npm packages safely.
# Swaps in the npm-specific README for @viewgraph/core, publishes,
# then restores the GitHub README - even if publish fails.
#
# Usage: bash scripts/publish.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo "Publishing @viewgraph/core..."

# Swap README for npm (shorter, focused on install/usage)
if [ -f npm-readme.md ]; then
  cp README.md README.github.bak
  cp npm-readme.md README.md
  trap 'echo "Restoring README..."; mv README.github.bak README.md' EXIT
fi

npm publish --access public

# Restore README (trap handles this, but be explicit)
if [ -f README.github.bak ]; then
  mv README.github.bak README.md
  trap - EXIT
fi

echo ""
echo "Publishing @viewgraph/playwright..."
cd packages/playwright
npm publish --access public

echo ""
echo "Done. Both packages published."
