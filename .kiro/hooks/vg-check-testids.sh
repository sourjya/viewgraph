#!/bin/bash
# ViewGraph: Check TestID Coverage
#
# PostToolUse hook on @viewgraph/find_missing_testids - after testid audit
# results are returned, reminds the agent to add the suggested testids to
# source code and re-capture to verify coverage.
#
# Installed by: viewgraph-init.js
# Trigger: postToolUse (@viewgraph/find_missing_testids)

EVENT=$(cat)
RESULT=$(echo "$EVENT" | grep -o '"tool_response"' 2>/dev/null)

if [ -n "$RESULT" ]; then
  echo "ViewGraph: TestID audit complete. For each missing testid, locate the element in source code using the selector and add the suggested data-testid attribute. After adding testids, request a new capture to verify coverage improved."
fi
exit 0
