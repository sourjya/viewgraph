#!/usr/bin/env bash
# Show working tree status, log to logs/git_status.log
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
git status 2>&1 | tee logs/git_status.log
