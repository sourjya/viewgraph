# ViewGraph MCP Server - Setup Runbook

How to install and configure the ViewGraph MCP server.

## Quick Setup (recommended)

For most users, the init script handles everything:

```bash
cd ~/my-project
npm install @viewgraph/core
npx viewgraph-init
```

This creates `.viewgraph/captures/`, detects your AI agent, writes the MCP config, and starts the server. You're done.

**Using a dev server?** Add `--url`:

```bash
npx viewgraph-init --url localhost:3000
```

## Manual Setup (advanced)

If you need to configure the server manually (custom ports, multiple captures dirs, etc.):

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VIEWGRAPH_CAPTURES_DIR` | `.viewgraph/captures` | Where capture JSON files are stored |
| `VIEWGRAPH_HTTP_PORT` | `9876` | HTTP receiver port for extension communication |
| `VIEWGRAPH_MAX_CAPTURES` | `100` | Max captures to index |
| `VIEWGRAPH_IDLE_TIMEOUT_MINUTES` | `30` | Minutes of inactivity before auto-shutdown. `0` = disabled |

### Start the server manually

```bash
VIEWGRAPH_CAPTURES_DIR=./my-captures VIEWGRAPH_HTTP_PORT=9877 npx @viewgraph/core
```

### MCP Configuration

The init script writes this automatically. If you need to edit it manually:

**Kiro** (`.kiro/settings/mcp.json`):
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

**Claude Code** (`.claude/mcp.json`), **Cursor** (`.cursor/mcp.json`): same format.

## Verify

```bash
npx viewgraph-status
```

Or check the server directly:

```bash
curl http://127.0.0.1:9876/health
```

## Troubleshooting

| Problem | Solution |
|---|---|
| Server won't start | Check Node.js version: `node --version` (must be 20+) |
| Port already in use | Another server is running. Use `npx viewgraph-init` which auto-finds a free port (9876-9879) |
| Extension can't connect | Verify server is running. Check sidebar for green/red dot. |
| No captures appearing | Check `.viewgraph/captures/` exists and is writable |
| MCP tools not showing | Restart your AI agent after running `npx viewgraph-init` |
