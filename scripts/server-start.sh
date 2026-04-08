#!/usr/bin/env bash
# Start the ViewGraph MCP server in the background.
# Logs to both screen and logs/server.log. Stores PID for shutdown.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/server.log"
PID_FILE="$LOG_DIR/server.pid"

mkdir -p "$LOG_DIR"

# Check if already running
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "[viewgraph] Server already running (PID $(cat "$PID_FILE"))"
  exit 1
fi

echo "[viewgraph] Starting MCP server..."
echo "[viewgraph] Log: $LOG_FILE"

# Start server, tee to both screen and log file, run in background
node "$PROJECT_DIR/server/index.js" 2>&1 | tee -a "$LOG_FILE" &
SERVER_PID=$!

# The tee process is $!, but we need the node PID (its parent in the pipe).
# Store the pipeline PID - killing it kills both.
echo "$SERVER_PID" > "$PID_FILE"

# Wait briefly to confirm startup
sleep 1
if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "[viewgraph] Server started (PID $SERVER_PID)"
  echo "[viewgraph] $(date '+%Y-%m-%d %H:%M:%S') - Server started (PID $SERVER_PID)" >> "$LOG_FILE"
else
  echo "[viewgraph] Server failed to start. Check $LOG_FILE"
  rm -f "$PID_FILE"
  exit 1
fi
