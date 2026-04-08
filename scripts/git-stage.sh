#!/usr/bin/env bash
# Stage all changes, log to logs/git_stage.log
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
git add -A 2>&1 | tee logs/git_stage.log
echo "All changes staged." | tee -a logs/git_stage.log
