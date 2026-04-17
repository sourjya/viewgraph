#!/bin/bash
# git-commit-push.sh - commit all changes on feature branch, merge to main, push
#
# Usage: bash scripts/git-commit-push.sh "commit message"
# Output: logs/git-commit-push.txt (overwritten each run)

REPO="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$REPO/logs/git-commit-push.txt"
MSG="${1:-chore: update}"

mkdir -p "$REPO/logs"

{
echo "=== COMMIT (feature branch) ==="
cd "$REPO"
git add -A
git commit --no-verify -m "$MSG"
echo "commit exit: $?"

echo ""
echo "=== MERGE TO MAIN ==="
BRANCH=$(git branch --show-current)
echo "merging branch: $BRANCH"

git checkout main
git merge "$BRANCH" --no-ff -m "merge: $MSG"
echo "merge exit: $?"

echo ""
echo "=== PUSH ==="
git push origin main --no-verify
echo "push exit: $?"

echo ""
echo "=== SWITCH BACK ==="
git checkout "$BRANCH"
echo "back on: $(git branch --show-current)"

echo ""
echo "=== FINAL LOG ==="
git log --oneline -5
} > "$OUT" 2>&1
