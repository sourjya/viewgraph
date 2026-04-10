# ViewGraph MCP Server

MCP server that reads ViewGraph capture files from disk and exposes 16 query/analysis/request tools to AI coding assistants via the [Model Context Protocol](https://modelcontextprotocol.io/).

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
| `audit_accessibility` | A11y audit: missing aria-labels, alt text, form labels, contrast ratios |
| `audit_layout` | Layout audit: element overflow, sibling overlap, viewport overflow |
| `compare_captures` | Diff two captures: added/removed elements, layout shifts, testid changes |
| `get_annotations` | Human annotations from review-mode captures |
| `get_annotated_capture` | Capture filtered to annotated nodes + comments |

### Bidirectional (M3)

| Tool | Description |
|---|---|
| `request_capture` | Request a capture from the browser extension via HTTP bridge |
| `get_request_status` | Poll for capture request completion |
| `get_fidelity_report` | Compare capture against HTML snapshot for fidelity metrics |

## Setup

```bash
npm install
```

### Configuration

Set the captures directory via env var:

```bash
export VIEWGRAPH_CAPTURES_DIR=/path/to/captures
```

Or create a `.viewgraphrc.json` in the ViewGraph project root:

```json
{
  "capturesDir": ".viewgraph/captures",
  "allowedDirs": [
    "/home/user/project-a/.viewgraph/captures",
    "/home/user/project-b/.viewgraph/captures"
  ]
}
```

### Multi-project routing

The server supports routing captures to different project directories via the
`x-captures-dir` HTTP header. The extension sends this header based on URL-to-project
mappings configured in extension options.

Security: the `x-captures-dir` value must match an entry in `allowedDirs`. Unrecognized
directories are rejected with 403. `viewgraph init` auto-registers projects in `allowedDirs`.

### Authentication

- **No `VIEWGRAPH_HTTP_SECRET` env var:** auth disabled (safe - server only listens on 127.0.0.1)
- **`VIEWGRAPH_HTTP_SECRET` set:** Bearer token auth enforced on all POST endpoints

### Port fallback

The HTTP receiver defaults to port 9876. If in use, it tries 9877, 9878, 9879 before failing.
The extension auto-discovers the server by probing these ports.

## Running

```bash
node index.js            # standalone
npm run dev:server       # via workspace (from project root)
```

The server uses stdio transport for MCP communication and starts an HTTP receiver
on localhost for extension communication.

### HTTP Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Server status, captures dir, writability |
| `GET /info` | Project info for auto-detection (capturesDir, projectRoot) |
| `GET /requests/pending` | Pending capture requests for extension polling |
| `POST /captures` | Receive capture JSON from extension |
| `POST /snapshots` | Receive HTML snapshots from extension |
| `GET /annotations/resolved` | Resolved annotations for extension sync |

## Testing

```bash
npm test                 # single run (235 tests)
npm run test:watch       # watch mode
```

## Architecture

```
index.js                 Entry point - wires watcher, indexer, tools, HTTP receiver
src/
  config.js              Config resolution (.viewgraphrc.json, env vars, allowedDirs)
  constants.js           Domain constants
  watcher.js             Chokidar file watcher on captures directory
  indexer.js             In-memory capture index (filename -> metadata)
  http-receiver.js       HTTP server for extension push, request polling, health check, /info
  request-queue.js       In-memory request queue (pending -> ack -> complete/expire)
  parsers/
    viewgraph-v2.js      ViewGraph v2 JSON parser
  analysis/
    node-queries.js      Flatten, filter, query nodes from parsed captures
    a11y-rules.js        Accessibility audit rules + contrast checking
    contrast.js          WCAG color contrast computation
    layout-analysis.js   Overlap/overflow/viewport detection
    capture-diff.js      Structural diff between two captures
    fidelity.js          Capture vs HTML snapshot fidelity comparison
  tools/
    list-captures.js     ... (one file per MCP tool)
  utils/
    validate-path.js     Path traversal prevention
```

Imports use `#src/` subpath aliases (Node.js native, no build step).
