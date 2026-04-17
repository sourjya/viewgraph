# Installation

## Quick Setup (Recommended)

Two steps. No install commands.

### 1. Install the browser extension

<a href="https://chromewebstore.google.com/detail/viewgraph-capture/dmgbneoidgmkdcfnlegmfijkedijjnjj"><img src="https://img.shields.io/badge/Chrome-Install_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Chrome Web Store"></a>  <a href="https://addons.mozilla.org/en-US/firefox/addon/viewgraph-capture/"><img src="https://img.shields.io/badge/Firefox-Install_Extension-FF7139?style=for-the-badge&logo=firefox-browser&logoColor=white" alt="Firefox Add-ons"></a>

Works in Edge, Brave, and Opera too (Chromium-based).

{% hint style="warning" %}
**Store versions may be outdated.** The Chrome Web Store and Firefox Add-ons review process can delay updates by days or weeks. After installing, check your extension version: click the ViewGraph icon → look for the version in the sidebar footer. If it shows an older version (e.g., v0.1.0 instead of the latest), install the latest ZIP directly from GitHub instead. See [Install from GitHub ZIP](#install-from-github-zip) below.
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

### Verify

1. Open your app in the browser
2. Click the ViewGraph toolbar icon
3. Green dot in the sidebar header = connected

![Green connection dot in sidebar](../.gitbook/assets/green-dot.png)

### Requirements

| Requirement | Minimum |
|---|---|
| [Node.js](https://nodejs.org/) | 22+ (LTS) |
| npm | 9+ |
| Chrome | 116+ (or Firefox 109+) |

---

## Alternative: npm Install

Use this if you need version pinning, offline use, or explicit config control.

```bash
npm install -g @viewgraph/core
cd ~/my-project
viewgraph-init
```

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

If the store version is outdated or you prefer manual control, install the latest extension directly from GitHub. This is the fastest way to get the newest features and fixes.

### Why is the store version behind?

Both the Chrome Web Store and Firefox Add-ons require a manual review process before publishing updates. This is a good thing - it protects users from malicious extensions. However, it means updates can take anywhere from a few hours to several weeks to appear in the store, depending on reviewer availability and queue length. This is outside our control and affects all browser extensions, not just ViewGraph.

During active development, the GitHub release will often be ahead of the store version. Both are safe to use - the store version is simply an older, already-reviewed build.

### Are the GitHub ZIPs safe?

Yes. The ZIP files on GitHub are built from the same open-source code you can see in the repository:

- The extension source code is in [`extension/`](https://github.com/sourjya/viewgraph/tree/main/extension) - fully readable
- ZIPs are produced by the [`scripts/build-extension.sh`](https://github.com/sourjya/viewgraph/blob/main/scripts/build-extension.sh) build script, which runs the standard build toolchain and packages the output
- Each release is tagged in git (e.g., `v0.3.7`) so you can verify exactly which code produced the ZIP
- You can always [build from source](#build-from-source) yourself if you prefer

The extension requests only the permissions it needs (listed in the [manifest](https://github.com/sourjya/viewgraph/blob/main/extension/manifest.json)) and runs entirely on your machine. No data is sent to any external server.

### Version mismatch warning

When the MCP server version is newer than your extension, ViewGraph shows a banner in the sidebar with a link to update. This means the server (installed via npm) has been updated but your browser extension hasn't received the store update yet. Follow the link to install the latest ZIP.

**Latest ZIPs:** [github.com/sourjya/viewgraph/tree/main/downloads](https://github.com/sourjya/viewgraph/tree/main/downloads)

### Chrome / Edge / Brave (persistent install)

1. Download `viewgraph-chrome-x.x.x.zip` from the [downloads folder](https://github.com/sourjya/viewgraph/tree/main/downloads)
2. Unzip to a permanent folder (e.g., `~/viewgraph-extension/`)
3. Open `chrome://extensions/` in your browser
4. Enable **Developer mode** (toggle in the top-right corner)
5. Click **Load unpacked** and select the unzipped folder
6. Pin the ViewGraph icon to your toolbar for easy access

The extension stays installed across browser restarts. To update, download the new ZIP, unzip over the same folder, and click the refresh icon on `chrome://extensions/`.

{% hint style="info" %}
**Disable the store version first.** If you have both the store version and the unpacked version installed, disable the store version on `chrome://extensions/` to avoid conflicts.
{% endhint %}

### Firefox (temporary - removed on restart)

1. Download `viewgraph-firefox-x.x.x.zip` from the [downloads folder](https://github.com/sourjya/viewgraph/tree/main/downloads)
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select the `.zip` file directly (no need to unzip)

{% hint style="warning" %}
**Firefox temporary add-ons are removed when the browser closes.** You'll need to re-load the ZIP each time you restart Firefox. For a persistent install, use the [Firefox Add-ons store](https://addons.mozilla.org/en-US/firefox/addon/viewgraph-capture/) or [build from source](#build-from-source) with `web-ext`.
{% endhint %}

### How to check your extension version

1. Click the ViewGraph icon in your browser toolbar
2. The version number appears in the sidebar footer (e.g., `v0.3.7`)
3. Compare with the latest version on [GitHub](https://github.com/sourjya/viewgraph/releases)

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
