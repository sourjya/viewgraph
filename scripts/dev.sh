#!/usr/bin/env bash
# Rebuild extension + restart MCP server in one shot.
# Usage: ./scripts/dev.sh [chrome|firefox]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Stop existing server (if running)
"$SCRIPT_DIR/server-stop.sh" 2>/dev/null || true

# Kill any stale process on port 9876
kill $(lsof -ti:9876) 2>/dev/null || true

# Build extension
"$SCRIPT_DIR/extension-build.sh" "${1:-chrome}"

# Start server
"$SCRIPT_DIR/server-start.sh"

echo ""
echo "[viewgraph] Ready. Reload extension in browser and capture."
