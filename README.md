# ViewGraph

Browser extension + MCP server for AI-powered UI capture, auditing, and annotation.

ViewGraph captures structured DOM snapshots from any web page and exposes them to AI coding assistants via the [Model Context Protocol](https://modelcontextprotocol.io/). Agents can query page structure, audit accessibility, find missing test IDs, compare captures, and act on human annotations  -  all through MCP tools.

## Components

| Component | Description | Status |
|---|---|---|
| [`server/`](./server/) | MCP server  -  reads capture files, exposes query tools | In Progress |
| [`extension/`](./extension/) | Firefox/Chrome extension  -  captures DOM, screenshots, annotations | Scaffolded |

## Quick Start

```bash
npm install
npm run dev:server     # start MCP server
npm run dev:ext        # start extension dev server (Chrome)
```

## Testing

```bash
npm test               # all tests
npm run test:server    # server only
```

## Project Structure

```
server/          MCP server (Node.js, @modelcontextprotocol/sdk)
extension/       Browser extension (WXT, Manifest V3)
docs/            Documentation, architecture, decisions, changelogs
.kiro/           Specs, steering docs, hooks
scripts/         Git and build scripts
```

## Documentation

- [Roadmap](./docs/roadmap/roadmap.md)  -  milestone plan
- [Spec Index](./.kiro/specs/README.md)  -  Kiro specs
- [ViewGraph v2 Format Spec](./docs/architecture/viewgraph-v2-format.md)  -  capture format
- [Format Research](./docs/architecture/viewgraph-format-research.md)  -  format analysis and design rationale

## License

MIT
