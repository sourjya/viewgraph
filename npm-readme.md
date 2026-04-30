# @viewgraph/core

The UI context layer for AI coding agents. Built to make agentic coding environmentally sustainable.

AI agents waste [60-80% of their tokens](https://arxiv.org/html/2601.14470v1) on orientation, not problem-solving. Every wasted token is wasted compute, wasted energy, and avoidable carbon emissions. ViewGraph delivers the UI context agents need in the smallest possible token footprint -- 97% fewer tokens per task, measured across 175 real captures.

A browser extension captures structured DOM snapshots from any web page, and this MCP server exposes them to your AI assistant through the [Model Context Protocol](https://modelcontextprotocol.io/).

## Install

Add to your AI agent's MCP config:

```json
{
  "mcpServers": {
    "viewgraph": { "command": "npx", "args": ["-y", "@viewgraph/core"] }
  }
}
```

The server runs automatically via `npx`, auto-creates `.viewgraph/captures/`, and learns your URL pattern from the first capture.

**Alternative:** For explicit version pinning and config control:

```bash
npm install -g @viewgraph/core
cd ~/my-project
viewgraph-init                        # creates config, starts server
viewgraph-init --url localhost:3000   # match your app's URL for auto-detection
```

## What's Included

- **MCP Server** with 41 tools for querying captures, auditing accessibility, detecting regressions, verifying fixes, and more
- **Init script** that auto-detects Kiro, Claude Code, Cursor, Windsurf, and Cline
- **Uninstall script** for clean project removal (`npx @viewgraph/core uninstall`)
- **Kiro Power assets** - 3 hooks, 12 prompt shortcuts, 3 steering docs (installed automatically for Kiro projects)

## What's New in v0.7

- **verify_fix** - one-call smoke test replaces 3-4 separate tool calls
- **get_capture_diff** - RFC 6902 JSON Patch diffs (50-1500x compression for hot-reload)
- **Style dedup + default omission** - 30-45% capture size reduction
- **Provenance metadata** - field-level source tagging (measured/derived/inferred)
- **21 enrichment collectors** - error boundaries, service worker state, build metadata
- **TracePulse integration** - frontend errors bridged to backend monitoring
- **Welcome page** on first extension install

## Browser Extension

Install the ViewGraph Capture extension separately:
- Chrome Web Store (approved and live)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/viewgraph-capture/)

Or [build from source](https://github.com/sourjya/viewgraph#for-developers-build-from-source).

## How It Works

```
Browser extension captures DOM --> .viewgraph/captures/ --> MCP server --> Your AI agent
```

1. Click the ViewGraph icon on any page
2. Click elements, describe what's wrong
3. Click "Send to Agent"
4. Your agent reads the capture via MCP and fixes the code

## Links

- [Documentation](https://chaoslabz.gitbook.io/viewgraph)
- [Quick Start](https://chaoslabz.gitbook.io/viewgraph/getting-started/quick-start)
- [GitHub](https://github.com/sourjya/viewgraph)
- [@viewgraph/playwright](https://www.npmjs.com/package/@viewgraph/playwright) - Playwright test fixture
