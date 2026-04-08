# ViewGraph

Browser extension + MCP server for AI-powered UI capture, auditing, and annotation.

ViewGraph captures structured DOM snapshots from any web page and exposes them to AI coding assistants via the [Model Context Protocol](https://modelcontextprotocol.io/). Agents can query page structure, audit accessibility, find missing test IDs, compare captures, and act on human annotations  -  all through MCP tools.

Works with any MCP-compatible agent: **Kiro**, **Claude Code**, **Cursor**, **Windsurf**, **Cline**, **Aider**, and more. No agent-specific code  -  pure MCP protocol. Tools that don't support MCP can read `.viewgraph.json` capture files directly from disk.

## Components

| Component | Description | Status |
|---|---|---|
| [`server/`](./server/) | MCP server  -  reads capture files, exposes query tools | In Progress |
| [`extension/`](./extension/) | Firefox/Chrome extension  -  captures DOM, screenshots, annotations | Scaffolded |

## Quick Start

```bash
# In your project
npm install viewgraph -D
npx viewgraph init          # auto-detect agent, write config, set up captures folder

# Then install the browser extension
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/viewgraph/
# Chrome:  (coming soon)
```

The `init` command detects your dev URLs from package.json, writes
`.viewgraphrc.json`, and configures your MCP agent (Kiro, Cursor, Claude Code,
Windsurf). The extension auto-discovers your project and routes captures to
the right folder.

For development on ViewGraph itself:

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
- [Universal Agent Integration](./docs/decisions/ADR-001-universal-agent-integration.md)  -  multi-tool architecture (Kiro, Claude Code, Cursor, Windsurf)
- [Multi-Project Routing](./docs/decisions/ADR-002-multi-project-capture-routing.md)  -  how the extension routes captures to the right project

## License

MIT
