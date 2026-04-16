# F16: Zero-Config Install - Design

## Overview

Make ViewGraph installable with just MCP config JSON + browser extension. No init scripts, no npm install, no config files. The server self-configures on first use.

## User Experience

### Before (current)
```bash
npm install -g @viewgraph/core    # or clone repo
cd your-project
viewgraph-init                     # creates config, .viewgraph/, starts server
# Then configure MCP in your agent
```

### After (zero-config)
```
1. Add to ~/.kiro/settings/mcp.json:
   { "mcpServers": { "viewgraph": { "command": "npx", "args": ["-y", "@viewgraph/core"] } } }
2. Install browser extension from Chrome/Firefox store
3. Done.
```

## Architecture Changes

### Server Boot Sequence (new)

```
npx -y @viewgraph/core
    |
    v
Detect transport mode:
  - stdin is TTY? -> HTTP+WS mode (manual start)
  - stdin is pipe? -> stdio mode (MCP client launched us)
    |
    v
Auto-configure:
  1. projectRoot = process.cwd()
  2. capturesDir = path.join(projectRoot, '.viewgraph', 'captures')
  3. mkdir -p capturesDir (if not exists)
  4. Load config.json if exists, else use defaults
    |
    v
Start MCP server (stdio or HTTP+WS)
```

### Default Config (when no config.json exists)

```js
{
  projectRoot: process.cwd(),
  urlPatterns: ['localhost'],     // accept any localhost URL
  autoAudit: false,
  smartSuggestions: true,
  maxSuggestions: 10,
}
```

### Auto-Learn URL Patterns

On first capture received:
1. Extract hostname + port from capture URL (e.g., `localhost:3000`)
2. Write `config.json` with learned pattern
3. Log: "Auto-configured URL pattern: localhost:3000"

This means subsequent server restarts remember the project's dev server URL.

### Transport Detection

```js
// In server entry point (index.js)
const isStdio = !process.stdin.isTTY;
if (isStdio) {
  // Launched by MCP client (Kiro, Claude, etc.) - use stdio transport
  startStdioTransport();
} else {
  // Launched manually (viewgraph-init, CLI) - use HTTP + WebSocket
  startHttpServer();
}
```

### MCP Config Variants

**Minimal (recommended):**
```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "npx",
      "args": ["-y", "@viewgraph/core"]
    }
  }
}
```

**From GitHub (bleeding edge):**
```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "npx",
      "args": ["-y", "github:sourjya/viewgraph"]
    }
  }
}
```

**With explicit project root:**
```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "npx",
      "args": ["-y", "@viewgraph/core", "--root", "/path/to/project"]
    }
  }
}
```

## What Changes in the Server

| Area | Current behavior | New behavior |
|---|---|---|
| Boot without config.json | Fails or uses hardcoded defaults | Auto-creates .viewgraph/, uses sensible defaults |
| Boot without .viewgraph/ | Requires viewgraph-init | Auto-creates directory |
| URL pattern matching | Requires config.json urlPatterns | Defaults to `['localhost']`, auto-learns on first capture |
| Transport | Always HTTP+WS | Auto-detect: stdio for MCP clients, HTTP+WS for manual |
| Project root | From config.json or CLI arg | Falls back to cwd |

## What Does NOT Change

- Browser extension behavior (port scanning, capture, annotate)
- MCP tool interfaces (all 36 tools work identically)
- Capture file format
- viewgraph-init workflow (still works, still recommended for power users)
- Multi-project setup (still requires config.json with explicit URL patterns)

## Migration Path

- Existing users: no changes needed, viewgraph-init still works
- New users: can use either path
- Docs: zero-config becomes the "Quick Start", viewgraph-init becomes "Advanced Setup"
