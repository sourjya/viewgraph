# Installation

All install methods - from zero-config to building from source.

## Standard Setup

Two steps. No install commands.

### 1. Install the browser extension

<a href="https://chromewebstore.google.com/detail/viewgraph-capture/dmgbneoidgmkdcfnlegmfijkedijjnjj"><img src="https://img.shields.io/badge/Chrome-Install_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Chrome Web Store"></a>  <a href="https://addons.mozilla.org/en-US/firefox/addon/viewgraph-capture/"><img src="https://img.shields.io/badge/Firefox-Install_Extension-FF7139?style=for-the-badge&logo=firefox-browser&logoColor=white" alt="Firefox Add-ons"></a>

Works in Edge, Brave, and Opera too (Chromium-based).

{% hint style="warning" %}
**Store versions may lag behind.** Chrome and Firefox review new submissions, which can take days. After installing, check your version in the sidebar footer. If it's behind the [latest release](https://github.com/sourjya/viewgraph/releases/latest), grab the ZIP from GitHub instead. See [Install from GitHub ZIP](#install-from-github-zip) below.
{% endhint %}

### 2. Add MCP config

Add to your agent's config file:

```json
{
  "mcpServers": {
    "viewgraph": { "command": "npx", "args": ["-y", "@viewgraph/core"] }
  }
}
```

| Agent | Config file location |
|---|---|
| Kiro | `~/.kiro/settings/mcp.json` |
| Claude Code | `~/.claude/mcp.json` |
| Cursor | `.cursor/mcp.json` (in project root) |
| Windsurf | `.windsurf/mcp.json` (in project root) |
| Cline | `.cline/mcp.json` (in project root) |

**Done.** The server runs automatically via `npx`, creates `.viewgraph/captures/`, and learns your URL pattern from the first capture.

### Optional: Run viewgraph-init for extra features

The zero-config MCP setup works immediately, but running `viewgraph-init` in your project folder unlocks additional features:

```bash
npm install -g @viewgraph/core
cd ~/my-project
viewgraph-init
```

| Feature | MCP config only | + viewgraph-init |
|---|---|---|
| Server starts automatically | ✅ | ✅ |
| Captures directory created | ✅ | ✅ |
| URL patterns learned | ✅ (auto from first capture) | ✅ (or explicit `--url`) |
| 🔒 Signed connection (HMAC) | ✅ | ✅ |
| Kiro Power (hooks, prompts, steering) | ❌ | ✅ |
| Custom URL pattern | ❌ (auto-detected) | ✅ (`--url localhost:3000`) |

{% hint style="info" %}
You don't need `viewgraph-init` to get started. Run it later when you want Kiro Power files or explicit URL patterns for multi-project setups.
{% endhint %}

### Verify

1. Open your app in the browser
2. Click the ViewGraph toolbar icon
3. Check the footer status dot:

| Status | Meaning |
|---|---|
| ![Green dot](../.gitbook/assets/green-dot.png) | Connected to MCP server |
| ![Red dot](../.gitbook/assets/red-dot.png) | Server not running or no matching project |

### Requirements

| Requirement | Minimum |
|---|---|
| [Node.js](https://nodejs.org/) | 22+ (LTS) |
| npm | 9+ |
| Chrome | 116+ (or Firefox 109+) |

---

## Alternative: npm Install

Use this if you need version pinning, offline use, or explicit config control.

**Step 1: Install ViewGraph globally** (one time only):
```bash
npm install -g @viewgraph/core
```

**Step 2: Set up your project:**
```bash
cd ~/my-project
viewgraph-init
```

**That's it.** The init script creates `.viewgraph/captures/`, detects your AI agent, writes the MCP config, and starts the server.

**Custom URL?** If your app runs on a specific host:port (e.g., `localhost:3000`), add `--url` so ViewGraph knows which pages belong to this project:

```bash
viewgraph-init --url localhost:3000
```

The init script:
- Creates `.viewgraph/captures/`
- Detects your AI agent and writes the MCP config
- Starts the server on localhost
- Installs Kiro Power assets (hooks, prompts, steering) if Kiro is detected

### Agent detection

| Agent | Detected by | Config written to | Extras |
|---|---|---|---|
| Kiro | `.kiro/` directory | `.kiro/settings/mcp.json` | Hooks, prompts, steering docs |
| Claude Code | `.claude/` directory | `.claude/mcp.json` | MCP tools only |
| Cursor | `.cursor/` directory | `.cursor/mcp.json` | MCP tools only |
| Generic | No agent detected | `.viewgraph/mcp.json` | MCP tools only |

### Starting the server in later sessions

Re-run `viewgraph-init` from your project. It restarts cleanly without duplicating config.

---

## Install from GitHub ZIP

{% hint style="success" %}
**GitHub Releases is always the most up-to-date source.** Store reviews can delay updates by days or weeks. If you want the latest features and fixes immediately, download from [GitHub Releases](https://github.com/sourjya/viewgraph/releases/latest).
{% endhint %}

If the store version is outdated, install the latest extension directly from GitHub. See the dedicated **[Install from GitHub](manual-install.md)** page for step-by-step instructions for Chrome and Firefox, version checking, and build transparency details.

---

## Build from Source

For contributors or anyone who wants to build the extension themselves.

```bash
git clone https://github.com/sourjya/viewgraph.git
cd viewgraph
npm install
npm run build                        # Chrome + Firefox + Playwright
npm run build:ext                    # Chrome only
npm run build:ext:firefox            # Firefox only
```

**Load in Chrome:** `chrome://extensions/` → Developer mode → Load unpacked → select `extension/.output/chrome-mv3`

![Chrome Developer Mode - Load unpacked extension](../.gitbook/assets/chrome-developer-mode-load-unpacked.png)

**Load in Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select any file in `extension/.output/firefox-mv3`

**Run the server:** `npm run dev:server`

---

## Updating

| Component | How to update |
|---|---|
| Chrome extension (store) | Auto-updates, but store reviews can delay updates by days/weeks |
| Chrome extension (ZIP) | Download new ZIP from [GitHub](https://github.com/sourjya/viewgraph/tree/main/downloads), unzip over same folder, refresh on `chrome://extensions/` |
| Firefox extension (store) | Auto-updates, but store reviews can delay updates |
| Firefox extension (ZIP) | Download new ZIP, re-load via `about:debugging` |
| MCP server (zero-config) | Automatic - `npx` fetches latest on each run |
| MCP server (npm install) | `npm update -g @viewgraph/core` |
| @viewgraph/playwright | `npm update @viewgraph/playwright` |

Check for updates: `npm outdated -g @viewgraph/core`

---

## Security

All install methods run entirely on your machine. The server binds to `127.0.0.1` only - not accessible from the network. See [Security](../reference/security.md) for the full comparison matrix.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Extension icon doesn't appear | Check `chrome://extensions/` - is it enabled? |
| Sidebar shows red dot | Server not running. Check MCP config or re-run `viewgraph-init`. |
| "Send to Agent" does nothing | Check sidebar connection status. Restart your agent. |
| Captures not appearing | Verify `.viewgraph/captures/` exists in your project. |
| Wrong project in sidebar | See [Multi-Project Setup](multi-project.md) for URL patterns. |

## Cloud IDEs

The extension runs in your local browser. For remote environments, you need port forwarding:

| Environment | Port forwarding |
|---|---|
| Local IDE | Not needed |
| GitHub Codespaces | Automatic |
| Gitpod | Automatic |
| SSH remote | `ssh -L 9876:localhost:9876` |

Standalone exports (Copy MD, Download Report) work without any server connection.
