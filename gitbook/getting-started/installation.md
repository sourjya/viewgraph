# Installation

Two ways to set up ViewGraph depending on your goal.

## For Users: Add ViewGraph to Your Project

This is the path for developers who want to use ViewGraph with their AI agent. You install it in **your project**, not in a separate folder.

### Step 1: Install the browser extension

<!-- TODO: Replace with actual CWS link when published -->
Install [ViewGraph Capture](https://chrome.google.com/webstore) from the Chrome Web Store. Works in Chrome, Edge, Brave, and Opera.

<!-- TODO: Uncomment when AMO listing is approved
Or from [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/viewgraph-capture/) for Firefox.
-->

Or [build from source](#for-developers-build-from-source) if you prefer.

### Step 2: Install the npm package in your project

```bash
cd ~/my-project          # your project, not a new folder
npm install viewgraph
```

<!-- TODO: Replace with actual link when published -->
Package: [viewgraph on npm](https://www.npmjs.com/package/viewgraph)

This adds the MCP server and init script to your project's `node_modules`.

### Step 3: Initialize

```bash
npx viewgraph-init
```

This creates `.viewgraph/captures/` in your project, detects your AI agent, writes the MCP config, and starts the server.

**Using a dev server?** Add `--url` so captures route correctly:

```bash
npx viewgraph-init --url localhost:3000
```

### Step 4: Verify

1. Click the ViewGraph icon on any page
2. The sidebar should show a **green dot** with "Connected"
3. Hover over elements - blue highlight should follow your cursor

![Green connection dot in sidebar](../.gitbook/assets/green-dot.png)

If the dot is red, the server isn't running. Run `npx viewgraph-init` again from your project folder.

### Requirements

| Requirement | Minimum Version |
|---|---|
| [Node.js](https://nodejs.org/) | 18.0.0+ (LTS) |
| npm | 9.0.0+ |
| Chrome | 116+ (or Firefox 109+) |

### Agent detection

The init script detects your agent by looking for config directories:

| Agent | Detected by | Config written to |
|---|---|---|
| Kiro | `.kiro/` directory exists | `.kiro/settings/mcp.json` |
| Claude Code | `.claude/` directory exists | `.claude/mcp.json` |
| Cursor | `.cursor/` directory exists | `.cursor/mcp.json` |
| Generic | No agent detected | `.viewgraph/mcp.json` |

For Kiro, the init script also installs Power assets: 3 hooks, 8 prompt shortcuts, and 3 steering docs.

---

## For Developers: Build from Source

This is the path for contributors or anyone who wants to build the browser extension themselves.

### Step 1: Clone the repo

```bash
git clone https://github.com/sourjya/viewgraph.git
cd viewgraph
npm install
```

### Step 2: Build the extension

```bash
npm run build                        # Chrome + Firefox + Playwright bundle
npm run build:ext:chrome             # Chrome only
npm run build:ext:firefox            # Firefox only
```

### Step 3: Load in browser

**Chrome:**
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select `extension/.output/chrome-mv3`

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file inside `extension/.output/firefox-mv3`

### Step 4: Run the server

```bash
npm run dev:server
```

### Step 5: Initialize in a test project

Open a separate terminal in any project folder:

```bash
cd ~/some-project
npx viewgraph-init
```

This points to the server you started in step 4.

---

## Starting the server in later sessions

The init script starts the server automatically on first run. For subsequent sessions, either:

- Re-run `npx viewgraph-init` from your project (restarts cleanly)
- Or run `npm run dev:server` from the ViewGraph repo (if building from source)

## Troubleshooting

| Problem | Solution |
|---|---|
| Extension icon doesn't appear | Check `chrome://extensions/` - is it enabled? |
| Sidebar shows red dot | Server isn't running. Run `npx viewgraph-init` from your project. |
| "Send to Agent" does nothing | Check sidebar connection status. Server must be running and auth token must match. |
| Captures not appearing in agent | Verify `.viewgraph/captures/` exists. Run `npx viewgraph-status` for a health check. |
| Wrong project shown in sidebar | Add `--url` pattern. See [Multi-Project Setup](multi-project.md). |
