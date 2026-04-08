# ViewGraph MCP Server - Setup Runbook

How to install, configure, and register the ViewGraph MCP server in any project.

## Prerequisites

- Node.js 18+ (LTS)
- npm
- A project directory where you want captures stored

## 1. Install

```bash
cd viewgraph
npm install
```

This installs dependencies for both the server and extension workspaces.

## 2. Configure environment

The server reads configuration from environment variables. Defaults work for local development.

| Variable | Default | Description |
|---|---|---|
| `VIEWGRAPH_CAPTURES_DIR` | `.viewgraph/captures` | Where capture JSON files are stored |
| `VIEWGRAPH_HTTP_PORT` | `9876` | HTTP receiver port for extension pushes |
| `VIEWGRAPH_HTTP_SECRET` | (auto-generated) | Shared secret for authenticated pushes |

To override, create a `.env` file in the server directory:

```bash
cp server/.env.example server/.env
# Edit as needed
```

## 3. Start the server

```bash
npm run dev:server
```

The server starts two transports:
- **stdio** - JSON-RPC for MCP communication with your AI agent
- **HTTP** on `localhost:9876` - receives captures pushed from the browser extension

On startup, the server logs a shared secret token to stderr. Copy this to the extension options page if you want authenticated pushes.

## 4. Register with Kiro

Add the server to your project's MCP configuration:

```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "node",
      "args": ["<path-to-viewgraph>/server/index.js"],
      "env": {
        "VIEWGRAPH_CAPTURES_DIR": ".viewgraph/captures"
      }
    }
  }
}
```

For Kiro CLI, this goes in `.kiro/settings/mcp.json` in your project root.

## 5. Verify

Start the server and check that your agent can see the tools:

```
> list_captures
```

If no captures exist yet, you'll get an empty list. Capture a page with the extension to populate it.

## 6. Captures directory

Captures are saved as `.viewgraph.json` files in the configured captures directory. The directory is created automatically on first capture.

Structure:
```
.viewgraph/
  captures/
    viewgraph-localhost-2026-04-08T120612.json
    viewgraph-localhost-2026-04-08T120612.html   (if HTML snapshot enabled)
    viewgraph-localhost-2026-04-08T120612.png    (if screenshot enabled)
```

## 7. Troubleshooting

**Server won't start:**
- Check Node.js version: `node --version` (must be 18+)
- Check port availability: `lsof -i :9876`

**Extension can't push:**
- Verify server is running and HTTP port is accessible
- Check shared secret matches between server and extension options
- Look at server stderr for error messages

**No captures appearing:**
- Check `VIEWGRAPH_CAPTURES_DIR` path is writable
- Verify the extension is connected (check extension popup for status)

**MCP tools not showing:**
- Verify `mcp.json` path is correct
- Restart your AI agent after adding the MCP configuration
