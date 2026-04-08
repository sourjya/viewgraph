#!/usr/bin/env bash
# Push current branch, log to logs/git_push.log
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
git push 2>&1 | tee logs/git_push.log
