# ViewGraph MCP Server

MCP server that reads ViewGraph capture files from disk and exposes query tools to AI coding assistants (Kiro, Claude, etc.) via the [Model Context Protocol](https://modelcontextprotocol.io/).

## Tools

| Tool | Description |
|---|---|
| `list_captures` | List available captures with optional URL filter and limit |
| `get_capture` | Retrieve full ViewGraph JSON by filename |
| `get_latest_capture` | Get the most recent capture (summary if >100KB) |
| `get_page_summary` | Compact summary: URL, title, viewport, element counts, clusters |

## Setup

```bash
npm install
```

Set the captures directory (or use default `~/.viewgraph/captures/`):

```bash
export VIEWGRAPH_CAPTURES_DIR=/path/to/captures
```

Or create a `.viewgraphrc.json` in your project root:

```json
{ "capturesDir": "./captures" }
```

## Running

```bash
node index.js            # standalone
npm run dev:server       # via workspace (from project root)
```

The server uses stdio transport for MCP communication. Register it in your MCP host's config (e.g., `.kiro/settings/mcp.json`).

## Testing

```bash
npm test                 # single run
npm run test:watch       # watch mode
```

## Architecture

```
index.js                 Entry point  -  wires watcher, indexer, tools
src/
├── config.js            Config resolution (.viewgraphrc.json, env vars)
├── constants.js         Domain constants
├── watcher.js           Chokidar file watcher on captures directory
├── indexer.js            In-memory capture index (filename → metadata)
├── parsers/
│   └── viewgraph-v2.js  ViewGraph v2 JSON parser
├── tools/
│   ├── list-captures.js
│   ├── get-capture.js
│   ├── get-latest.js
│   └── get-page-summary.js
└── utils/
    └── validate-path.js  Path traversal prevention
```
