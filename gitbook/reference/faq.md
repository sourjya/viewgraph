# FAQ

## General

### What is ViewGraph?
A browser extension + MCP server that captures structured DOM snapshots and exposes them to AI coding agents. You click a broken element, describe what's wrong, and your agent fixes the code with full UI context.

### Which AI agents does it work with?
Any MCP-compatible agent: Kiro, Claude Code, Cursor, Windsurf, Cline, Aider, and others. The 37 MCP tools are the same regardless of agent.

### Does it work with any web app?
Yes. ViewGraph captures the rendered DOM from the browser. It doesn't matter what backend technology your app uses - Python, Ruby, Java, Go, PHP, Node.js, or static HTML.

### Do I need to modify my application code?
No. ViewGraph runs alongside your project as a standalone tool. It reads the DOM through the browser extension and never injects into or modifies your application.

## Installation

### How do I install it?

**Quickest way (no install needed):** Add this to your AI agent's MCP config and you're done:
```json
{ "mcpServers": { "viewgraph": { "command": "npx", "args": ["-y", "@viewgraph/core"] } } }
```

**With explicit setup:**
```bash
npm install -g @viewgraph/core
cd ~/my-project
viewgraph-init
```
Then install the browser extension from the Chrome Web Store or Firefox Add-ons. See [Installation](../getting-started/installation.md) for details.

### Does it work on Windows / macOS / Linux?
Yes. The MCP server runs on Node.js 22+. The extension works in Chrome and Firefox on all platforms. WSL (Windows Subsystem for Linux) is also supported.

### Does it work with cloud IDEs (Codespaces, Gitpod)?
Partially. The extension runs in your local browser and the MCP server runs in the cloud IDE. They communicate via localhost, so you need port forwarding (Codespaces and Gitpod do this automatically for most ports). The standalone export modes (Copy MD, Download Report) work without any server. The `@viewgraph/playwright` package runs entirely server-side with no extension needed.

### Can I use it with multiple projects?
Yes. Up to 4 projects can run simultaneously, each on its own port (9876-9879). The extension detects running servers and routes captures to the correct project automatically. See [Multi-Project Setup](../getting-started/multi-project.md) for details and workarounds if you need more.

## Usage

### How do I capture a page?
Click the ViewGraph icon in your browser toolbar. The sidebar opens and elements highlight as you hover. Click elements to annotate them, then click "Send to Agent."

### Can I use it without an AI agent?
Yes. The extension works standalone for QA and bug reporting. Click "Copy MD" for a markdown report or "Report" for a ZIP with screenshots. No MCP server needed.

### How do I generate tests from a capture?
Capture a page, then tell your agent `@vg-tests`. The agent reads the capture via MCP tools and generates a Playwright test file with correct locators for every interactive element.

### What data does a capture include?
Every visible element with CSS selectors, computed styles, bounding boxes, accessibility attributes, data-testid values, plus network requests, console errors, component names, and 11 other enrichment data types.

### Are there keyboard shortcuts?
Yes. When the sidebar is open: `Esc` to close, `Ctrl+Enter` to send to agent, `Ctrl+Shift+C` to copy markdown, `1/2/3` to set severity, `Delete` to remove an annotation. Click the `?` button in the sidebar header for the full list. See [Keyboard Shortcuts](keyboard-shortcuts.md).

### What are smart suggestions?
When you select an element, the annotation panel shows clickable suggestion chips based on detected issues - "Missing aria-label", "No data-testid", "Low contrast". Click a chip to populate your comment. Controlled by the `smartSuggestions` setting in `.viewgraph/config.json`.

### Can I auto-audit captures?
Yes. Toggle "Auto-Audit" in the Inspect tab. When enabled, the server automatically runs accessibility, layout, and testid audits after each capture and shows results in the sidebar. Controlled by the `autoAudit` setting in `.viewgraph/config.json`.

### How do I compare against a baseline?
In the Inspect tab, click "Set" to promote the latest capture as your baseline. Click "Compare" to see a structural diff: elements added, removed, moved, or with changed testids.

### Can I use ViewGraph for feature ideation?
Yes. Set the annotation category to "Idea" instead of a bug category. Write your feature ideas as comments while looking at the actual UI. Then use `@vg-ideate` to generate a structured feature spec with requirements, user stories, and implementation tasks - all grounded in the real UI context from the capture.

## Security & Privacy

### Does ViewGraph send data to external servers?
No. All captures stay on your local machine. The extension communicates only with a server running on localhost (127.0.0.1). No cloud services, no analytics, no telemetry.

### Is it safe to use on production sites?
Yes. ViewGraph only reads the DOM - it never modifies the page, submits forms, or makes network requests on behalf of the site. It's a read-only observer.

### Why is there no authentication on the local server?
The server binds to localhost only and is not accessible from the network. Auth tokens were removed for beta because they caused more problems than they solved (silent failures, token sync issues). Post-beta, [native messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging) will replace localhost HTTP entirely. See [ADR-010](https://github.com/sourjya/viewgraph/blob/main/docs/decisions/ADR-010-remove-http-auth-beta.md) for the full security analysis.

## Troubleshooting

{% hint style="info" %}
The `viewgraph-init` command requires a one-time global install: `npm install -g @viewgraph/core`. If you're using the zero-config setup (MCP JSON only), you don't need `viewgraph-init` at all.
{% endhint %}

### Typing `@vg-review` in Kiro IDE asks me to create a new spec
That's expected - Kiro IDE interprets `@` as a spec reference. Use the **Hooks panel** in the sidebar instead, or type the shortcut **without `@`** (e.g., `vg-review`). The `@` prefix is for Kiro CLI only. See [Kiro Power](../features/kiro-power.md#kiro-ide-vs-kiro-cli) for the full IDE vs CLI guide.

### The sidebar shows a red dot
The server isn't running. This usually means it timed out after inactivity. See [Server timed out](#server-timed-out) below.

### Server timed out

The ViewGraph server auto-shuts down after 30 minutes of inactivity (configurable via `VIEWGRAPH_IDLE_TIMEOUT_MINUTES`). Any activity - captures, MCP tool calls, WebSocket messages - resets the timer. When it fires, the sidebar shows a red dot and "Server timed out" banner.

**To restart:**

| Environment | How to restart |
|---|---|
| **Kiro IDE** | Click the Kiro icon in the sidebar, right-click **viewgraph** MCP, click **Reconnect** |
| **Kiro CLI** | Quit and restart with `kiro-cli chat -r` (the `-r` flag restarts all MCPs) |
| **Other MCP agents** | Restart your agent - it will re-launch the MCP server automatically |
| **Manual** | Run `viewgraph-init` from your project folder, or `npx @viewgraph/core` |

**To prevent timeouts:**
- Set `VIEWGRAPH_IDLE_TIMEOUT_MINUTES=0` in your environment to disable auto-shutdown
- Enable **AUTO-CAPTURE** in the Inspect tab - each capture resets the timer
- The server also stays alive during active annotation sessions (WebSocket keepalive)

### "Send to Agent" shows green checkmark but no capture appears
Kill all servers and re-init: `pkill -f "node.*server/index.js"` then `viewgraph-init`.

### Wrong project shown in sidebar
Add a URL pattern so ViewGraph routes captures to the correct project: `viewgraph-init --url localhost:3000`. See [Multi-Project Setup](../getting-started/multi-project.md).

### The page looks unstyled when opened as a file
Chrome blocks cross-origin requests for `file://` URLs. Serve the files via HTTP instead: `npx serve .`

### How do I reset project settings?
Delete `.viewgraph/config.json` and re-run `viewgraph-init`. The init script recreates it with defaults.

### Where are screenshots and HTML snapshots saved?
In `.viewgraph/screenshots/` (PNG) and `.viewgraph/snapshots/` (HTML). Enable them in the sidebar settings (footer link). They're saved alongside the JSON capture on every "Send to Agent" or manual capture.
