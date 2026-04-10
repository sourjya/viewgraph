#!/bin/bash
# ViewGraph: Fix Annotations Reminder
#
# PostToolUse hook on @viewgraph/get_annotations - when annotations are
# retrieved, reminds the agent to work through them by severity and
# resolve each one after fixing.
#
# Installed by: viewgraph-init.js
# Trigger: postToolUse (@viewgraph/get_annotations)

EVENT=$(cat)
RESULT=$(echo "$EVENT" | grep -o '"tool_response"' 2>/dev/null)

if [ -n "$RESULT" ]; then
  echo "ViewGraph: Annotations loaded. Work through them by severity (critical > major > minor). After fixing each issue, call resolve_annotation with action, summary, and files_changed."
fi
exit 0
