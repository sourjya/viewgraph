# @viewgraph/core

The UI context layer for AI coding agents. A browser extension captures structured DOM snapshots from any web page, and this MCP server exposes them to your AI assistant through the [Model Context Protocol](https://modelcontextprotocol.io/).

## Install

```bash
cd ~/my-project
npm install @viewgraph/core
npx viewgraph-init
```

The init script creates `.viewgraph/captures/`, detects your AI agent, writes the MCP config, and starts the server.

**Using a dev server?** Add `--url`:

```bash
npx viewgraph-init --url localhost:3000
```

## What's Included

- **MCP Server** with 36 tools for querying captures, auditing accessibility, detecting regressions, and more
- **Init script** that auto-detects Kiro, Claude Code, Cursor, and other MCP agents
- **Kiro Power assets** - 3 hooks, 8 prompt shortcuts, 3 steering docs (installed automatically for Kiro projects)

## Browser Extension

Install the ViewGraph Capture extension separately:
- Chrome Web Store (pending review)
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
