# Installation

Detailed setup guide for all platforms, browsers, and AI agents.

## Requirements

| Requirement | Minimum Version | Notes |
|---|---|---|
| Node.js | 18.0.0+ (LTS) | Runs the server and builds the extension |
| npm | 9.0.0+ | Workspaces support required |
| Chrome | 116+ | Manifest V3 extension |
| Firefox | 109+ | Manifest V3 extension |

## Step 1: Clone and install

```bash
git clone https://github.com/sourjya/viewgraph.git
cd viewgraph
npm install
```

This installs dependencies for both the server and extension via npm workspaces.

## Step 2: Install the browser extension

### From the Chrome Web Store (recommended)

<!-- TODO: Replace with actual CWS link when published -->
Install [ViewGraph Capture](https://chrome.google.com/webstore) from the Chrome Web Store. Works in Chrome, Edge, Brave, and Opera.

### From source (for development)

If you want to modify the extension or use Firefox:

**Chrome:**
```bash
npm run build:ext
```
1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select: `<your-viewgraph-path>/extension/.output/chrome-mv3`

**Firefox:**
```bash
npm run build:ext -- --browser firefox
```
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file inside: `<your-viewgraph-path>/extension/.output/firefox-mv3`

The ViewGraph icon appears in your browser toolbar.

## Step 3: Initialize in your project

Open a terminal in your project's root directory and run:

```bash
npx viewgraph-init
```

The init script automatically:
- Creates `.viewgraph/captures/` for storing capture files
- Generates an auth token at `.viewgraph/.token`
- Detects your AI agent and writes the appropriate MCP config
- Starts the MCP server as a background process

### Agent detection

The init script detects your agent by looking for config directories:

| Agent | Detected by | Config written to |
|---|---|---|
| Kiro | `.kiro/` directory exists | `.kiro/settings/mcp.json` |
| Claude Code | `.claude/` directory exists | `.claude/mcp.json` |
| Cursor | `.cursor/` directory exists | `.cursor/mcp.json` |
| Generic | No agent detected | `.viewgraph/mcp.json` |

For Kiro, the init script also installs Power assets: 3 hooks, 8 prompt shortcuts, and 3 steering docs.

### Dev server URL

If your app runs on a dev server, add `--url` so the extension routes captures to the right project:

```bash
npx viewgraph-init --url localhost:3000
```

Multiple URLs:

```bash
npx viewgraph-init --url localhost:3000 --url staging.myapp.com
```

See [Multi-Project Setup](multi-project.md) for details.

## Step 4: Verify

1. Click the ViewGraph icon on any page
2. The sidebar should show a **green dot** with "Connected"
3. Hover over elements - blue highlight should follow your cursor

If the dot is red, the server isn't running. Run `npx viewgraph-init` again from your project folder.

## Starting the server in later sessions

The init script starts the server automatically. For subsequent sessions:

```bash
npm run dev:server       # from the ViewGraph directory
```

Or re-run `npx viewgraph-init` from your project - it restarts the server cleanly.

## Troubleshooting

| Problem | Solution |
|---|---|
| Extension icon doesn't appear | Check `chrome://extensions/` - is it enabled? |
| Sidebar shows red dot | Server isn't running. Run `npx viewgraph-init` from your project. |
| "Send to Agent" does nothing | Check sidebar connection status. Server must be running and auth token must match. |
| Captures not appearing in agent | Verify `.viewgraph/captures/` exists. Run `npx viewgraph-status` for a health check. |
| Wrong project shown in sidebar | Add `--url` pattern. See [Multi-Project Setup](multi-project.md). |
