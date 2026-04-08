#!/usr/bin/env bash
# Create new branch from main, log to logs/git_branch.log
# Usage: ./scripts/git-branch.sh feat/hover-inspector
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
if [ -z "${1:-}" ]; then echo "Usage: $0 branch-name"; exit 1; fi
git checkout main 2>&1 | tee logs/git_branch.log
git pull 2>&1 | tee -a logs/git_branch.log
git checkout -b "$1" 2>&1 | tee -a logs/git_branch.log
