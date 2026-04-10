#!/bin/bash
# ViewGraph: Capture and Audit Page
#
# AgentSpawn hook - injects available capture context when the agent starts.
# Tells the agent what ViewGraph captures are available so it can proactively
# offer to audit or fix UI issues.
#
# Installed by: viewgraph-init.js
# Trigger: agentSpawn

CAPTURES_DIR=".viewgraph/captures"

if [ ! -d "$CAPTURES_DIR" ]; then
  echo "ViewGraph: No captures directory found."
  exit 0
fi

COUNT=$(find "$CAPTURES_DIR" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -eq 0 ]; then
  echo "ViewGraph: No captures available. Use the browser extension to capture a page."
  exit 0
fi

LATEST=$(ls -t "$CAPTURES_DIR"/*.json 2>/dev/null | head -1 | xargs basename)
echo "ViewGraph: $COUNT capture(s) available. Latest: $LATEST"
echo "Use @vg-audit for a full audit, @vg-review to act on annotations, or @vg-diff to compare recent captures."
