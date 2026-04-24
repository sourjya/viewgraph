#!/bin/bash
# ViewGraph native messaging host wrapper
# Chrome/Firefox native messaging requires an executable, not a Node.js script.
# This wrapper invokes node with the server entry point and --native-host flag.
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/server/index.js" --native-host
