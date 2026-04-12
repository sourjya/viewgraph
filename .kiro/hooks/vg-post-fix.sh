#!/bin/bash
# ViewGraph: Post-Fix Verify
#
# PostToolUse hook on fs_write - when UI files are edited, reminds the agent
# to request a verification capture. Only triggers for UI-related file types.
#
# Installed by: viewgraph-init.js
# Trigger: postToolUse (fs_write)

EVENT=$(cat)
FILE=$(echo "$EVENT" | grep -o '"path":"[^"]*"' | head -1 | sed 's/"path":"//;s/"//')

case "$FILE" in
  *.html|*.css|*.scss|*.jsx|*.tsx|*.vue|*.svelte)
    echo "ViewGraph: UI file edited ($FILE). Consider requesting a capture to verify the fix visually."
    ;;
esac
exit 0
