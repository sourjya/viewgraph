#!/usr/bin/env bash
# Package ViewGraph for handoff to testers/collaborators.
# Produces dist/viewgraph-handoff.zip with extension + setup guide.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."
DIST="$ROOT/dist"
HANDOFF="$DIST/viewgraph-handoff"

rm -rf "$HANDOFF" "$DIST/viewgraph-handoff.zip"
mkdir -p "$HANDOFF"

# 1. Build extension
echo "Building extension..."
(cd "$ROOT/extension" && npm run build) 2>&1 | tail -1

# 2. Zip extension output
echo "Packaging extension..."
(cd "$ROOT/extension/.output/chrome-mv3" && zip -r "$HANDOFF/viewgraph-extension.zip" . -x '*.DS_Store') > /dev/null

# 3. Write setup guide
cat > "$HANDOFF/README-setup.md" << 'GUIDE'
# ViewGraph Setup

## Option A: Extension Only (no AI agent needed)

Annotate UI issues and export as Markdown or ZIP reports.

### Install (2 minutes)

1. Unzip `viewgraph-extension.zip` into a folder (e.g. `~/viewgraph-ext/`)
2. Open Chrome, go to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**, select the unzipped folder
5. Pin the ViewGraph icon in your toolbar

### Use

1. Navigate to the page you want to review
2. Click the ViewGraph icon, then **Annotate**
3. **Click** any element to annotate it, or **Shift+drag** to select a region
4. Add comments, set severity and category
5. Export:
   - **Copy MD** - copies Markdown bug report to clipboard
   - **Report** - downloads a ZIP with Markdown + screenshots

No server, no Node.js, no setup beyond the extension.

---

## Option B: Full Setup (with AI agent)

Extension + MCP server for the complete annotate-send-fix loop.

### Prerequisites

- Node.js 18+ (`node --version`)
- Chrome 116+
- An MCP-compatible agent (Kiro, Claude Code, Cursor, etc.)

### Install (5 minutes)

1. Install the extension (same as Option A above)

2. Clone and install the server:
   ```bash
   git clone https://github.com/sourjya/viewgraph.git
   cd viewgraph
   npm install
   ```

3. From your project directory, run init:
   ```bash
   node /path/to/viewgraph/scripts/viewgraph-init.js
   ```
   This creates `.viewgraph/captures/` and writes MCP config for your agent.

4. Start the server:
   ```bash
   cd /path/to/viewgraph
   npm run dev:server
   ```
   The green dot in the extension popup confirms connection.

5. Configure project mapping (optional, for multi-project):
   - Right-click ViewGraph icon -> Options
   - Map URL patterns to capture directories

### Use

1. Open your app in Chrome
2. Click ViewGraph icon -> **Annotate**
3. Annotate issues, then click **Send to Kiro**
4. In your AI agent, ask about the annotations - it has full DOM context
GUIDE

echo ""
echo "Handoff package ready:"
echo "  $HANDOFF/viewgraph-extension.zip  (Chrome extension)"
echo "  $HANDOFF/README-setup.md          (setup guide)"
echo ""
echo "Zip the whole thing:  cd dist && zip -r viewgraph-handoff.zip viewgraph-handoff/"
