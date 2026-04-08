#!/usr/bin/env bash
# Commit with message, log to logs/git_commit.log
# Usage: ./scripts/git-commit.sh "feat(server): add list_captures tool"
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
if [ -z "${1:-}" ]; then echo "Usage: $0 \"commit message\""; exit 1; fi
git commit -m "$1" 2>&1 | tee logs/git_commit.log
