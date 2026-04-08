# ViewGraph MCP Server

MCP server that reads ViewGraph capture files from disk and exposes 11 query/analysis tools to AI coding assistants via the [Model Context Protocol](https://modelcontextprotocol.io/).

Works with any MCP-compatible agent: Kiro, Claude Code, Cursor, Windsurf, Cline, Aider.

## Tools

### Core (M1)

| Tool | Description |
|---|---|
| `list_captures` | List available captures with optional URL filter and limit |
| `get_capture` | Retrieve full ViewGraph JSON by filename |
| `get_latest_capture` | Get the most recent capture (summary if >100KB) |
| `get_page_summary` | Compact summary: URL, title, viewport, element counts, clusters |

### Analysis (M2)

| Tool | Description |
|---|---|
| `get_elements_by_role` | Filter nodes by role: button, link, input, heading, image, table, nav, form |
| `get_interactive_elements` | All clickable/editable elements with selectors and labels |
| `find_missing_testids` | Interactive elements lacking data-testid, with suggested values |
| `audit_accessibility` | A11y audit: missing aria-labels, alt text, form labels |
| `compare_captures` | Diff two captures: added/removed elements, layout shifts, testid changes |
| `get_annotations` | Human annotations from review-mode captures |
| `get_annotated_capture` | Capture filtered to annotated nodes + comments |

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

The server uses stdio transport for MCP communication. Register it in your MCP host's config.

## Testing

```bash
npm test                 # single run (85 tests, 19 files)
npm run test:watch       # watch mode
```

## Architecture

```
index.js                 Entry point - wires watcher, indexer, tools
src/
├── config.js            Config resolution (.viewgraphrc.json, env vars)
├── constants.js         Domain constants
├── watcher.js           Chokidar file watcher on captures directory
├── indexer.js           In-memory capture index (filename -> metadata)
├── parsers/
│   └── viewgraph-v2.js  ViewGraph v2 JSON parser (plain keys)
├── analysis/
│   ├── node-queries.js  Flatten, filter, query nodes from parsed captures
│   ├── a11y-rules.js    Accessibility audit rules
│   └── capture-diff.js  Structural diff between two captures
├── tools/
│   ├── list-captures.js
│   ├── get-capture.js
│   ├── get-latest.js
│   ├── get-page-summary.js
│   ├── get-elements-by-role.js
│   ├── get-interactive.js
│   ├── find-missing-testids.js
│   ├── audit-accessibility.js
│   ├── compare-captures.js
│   ├── get-annotations.js
│   └── get-annotated-capture.js
└── utils/
    └── validate-path.js  Path traversal prevention
```

Imports use `#src/` subpath aliases (Node.js native, no build step).
