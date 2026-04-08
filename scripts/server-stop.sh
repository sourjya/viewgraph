#!/usr/bin/env bash
# Stop the ViewGraph MCP server.
# Reads PID from logs/server.pid, sends SIGTERM, cleans up.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/server.log"
PID_FILE="$LOG_DIR/server.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "[viewgraph] No PID file found. Server not running?"
  exit 0
fi

PID=$(cat "$PID_FILE")

if ! kill -0 "$PID" 2>/dev/null; then
  echo "[viewgraph] Process $PID not running. Cleaning up stale PID file."
  rm -f "$PID_FILE"
  exit 0
fi

echo "[viewgraph] Stopping server (PID $PID)..."
kill "$PID"

# Wait up to 5 seconds for graceful shutdown
for i in $(seq 1 10); do
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "[viewgraph] Server stopped."
    echo "[viewgraph] $(date '+%Y-%m-%d %H:%M:%S') - Server stopped (PID $PID)" >> "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 0
  fi
  sleep 0.5
done

# Force kill if still running
echo "[viewgraph] Server didn't stop gracefully. Sending SIGKILL..."
kill -9 "$PID" 2>/dev/null || true
rm -f "$PID_FILE"
echo "[viewgraph] Server killed."
echo "[viewgraph] $(date '+%Y-%m-%d %H:%M:%S') - Server killed (SIGKILL, PID $PID)" >> "$LOG_FILE"
