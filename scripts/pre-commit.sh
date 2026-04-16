#!/bin/bash
# Pre-commit hook: runs lint and blocks commit if errors found.
# Install: cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -e

echo "[pre-commit] Running lint..."
npm run lint --silent 2>&1 | tail -3

RESULT=$(npm run lint --silent 2>&1 | grep "error" | grep -v "0 errors" | head -1)
if [ -n "$RESULT" ]; then
  echo ""
  echo "[pre-commit] BLOCKED: lint errors found. Fix before committing."
  echo "$RESULT"
  exit 1
fi

echo "[pre-commit] Lint passed."
