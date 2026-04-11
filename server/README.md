# ViewGraph MCP Server

MCP server that reads ViewGraph capture files from disk and exposes 34 query/analysis/request tools to AI coding assistants via the [Model Context Protocol](https://modelcontextprotocol.io/).

Works with any MCP-compatible agent: Kiro, Claude Code, Cursor, Windsurf, Cline, Aider.

## Tools (34)

### Core (4)

| Tool | Description |
|---|---|
| `list_captures` | List available captures with optional URL filter and limit |
| `get_capture` | Retrieve full ViewGraph JSON by filename |
| `get_latest_capture` | Get the most recent capture (summary if >100KB) |
| `get_page_summary` | Compact summary: URL, title, viewport, element counts, clusters |

### Analysis (8)

| Tool | Description |
|---|---|
| `get_elements_by_role` | Filter nodes by role: button, link, input, heading, image, table, nav, form |
| `get_interactive_elements` | All clickable/editable elements with selectors and labels |
| `find_missing_testids` | Interactive elements lacking data-testid, with suggested values |
| `audit_accessibility` | A11y audit: missing aria-labels, alt text, form labels, contrast ratios, axe-core results |
| `audit_layout` | Layout audit: element overflow, sibling overlap, viewport overflow |
| `compare_captures` | Diff two captures: added/removed elements, layout shifts, testid changes |
| `get_annotations` | Human annotations from review-mode captures |
| `get_annotation_context` | Capture filtered to annotated nodes + comments |

### Bidirectional (3)

| Tool | Description |
|---|---|
| `request_capture` | Request a capture from the browser extension (purpose: capture/inspect/verify) |
| `get_request_status` | Poll for capture request completion (pending/acknowledged/completed/declined/expired) |
| `get_fidelity_report` | Compare capture against HTML snapshot for fidelity metrics |

### Baseline and Regression (3)

| Tool | Description |
|---|---|
| `set_baseline` | Promote a capture to golden baseline for its URL |
| `compare_baseline` | Diff latest capture vs baseline - detect structural regressions |
| `list_baselines` | List all stored baselines with metadata |

### Annotation Intelligence (7)

| Tool | Description |
|---|---|
| `resolve_annotation` | Mark annotation as fixed/wontfix/duplicate/invalid |
| `get_unresolved` | Unresolved annotations from one or all captures |
| `check_annotation_status` | Compare annotations against newer capture to detect resolved issues |
| `diff_annotations` | Track persistent issues across multiple captures |
| `detect_recurring_issues` | Find UI elements flagged repeatedly across captures |
| `analyze_patterns` | Detect recurring issue patterns from resolved annotations |
| `generate_spec` | Generate Kiro spec (requirements + tasks) from annotations |

### Session and Journey (5)

| Tool | Description |
|---|---|
| `list_sessions` | List capture sessions (grouped user journeys) |
| `get_session` | Full step sequence for a capture session |
| `analyze_journey` | Analyze recorded user journey for issues across steps |
| `visualize_flow` | Build Mermaid state machine diagram from session |
| `get_capture_stats` | Aggregate statistics across all captures |

### Source and Quality (4)

| Tool | Description |
|---|---|
| `find_source` | Find source file that renders a DOM element (testid/label grep) |
| `check_consistency` | Compare elements across pages for style inconsistencies |
| `compare_screenshots` | Pixel-by-pixel screenshot comparison |
| `validate_capture` | Check capture for quality issues (empty pages, missing data) |

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

Zero-config by default. The server auto-generates a random UUID token at startup and writes it to `.viewgraph/.token` (mode 0600). The extension reads the token from the `/info` endpoint and includes it as a `Bearer` header on all POST requests.

- **Default:** auto-generated token, no manual setup needed
- **Override:** set `VIEWGRAPH_HTTP_SECRET` env var to use a fixed token (useful for CI or shared environments)
- **Scope:** all POST endpoints require auth; GET endpoints (/health, /info, /requests/pending) remain open

### Port fallback

The HTTP receiver defaults to port 9876. If in use, it tries 9877, 9878, 9879 before failing.
The extension auto-discovers the server by probing these ports.

## Running

```bash
node index.js            # standalone
npm run dev:server       # via workspace (from project root)
```

The server uses stdio transport for MCP communication and starts an HTTP receiver
on localhost for extension communication. A WebSocket server runs alongside for
real-time annotation collaboration.

### HTTP Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Server status, captures dir, writability |
| `GET /info` | Project info for auto-detection (capturesDir, projectRoot) |
| `GET /captures` | List captures, optional URL filter |
| `GET /captures/compare` | Diff two captures by filename (a, b params) |
| `GET /requests/pending` | Pending capture requests for extension polling |
| `POST /requests/:id/ack` | Acknowledge a capture request |
| `POST /requests/:id/decline` | Decline a capture request (optional reason in body) |
| `POST /captures` | Receive capture JSON from extension |
| `POST /snapshots` | Receive HTML snapshots from extension |
| `POST /baselines` | Promote a capture to golden baseline |
| `GET /annotations/resolved` | Resolved annotations for extension sync |

### WebSocket

The server runs a WebSocket endpoint at `ws://localhost:{port}/ws` for real-time
annotation sync. The extension connects on sidebar open and receives live updates
when annotations are created, updated, or resolved.

## Testing

```bash
npm test                 # single run (324 tests)
npm run test:watch       # watch mode
```

## Architecture

```
index.js                 Entry point - wires watcher, indexer, tools, HTTP receiver, WS server
src/
  config.js              Config resolution (.viewgraphrc.json, env vars, allowedDirs)
  constants.js           Domain constants
  watcher.js             Chokidar file watcher on captures directory
  indexer.js             In-memory capture index (filename -> metadata)
  http-receiver.js       HTTP server for extension push, request polling, health check, /info
  request-queue.js       In-memory request queue (pending -> ack -> complete/decline/expire)
  ws-server.js           WebSocket server for real-time annotation collaboration
  baselines.js           Golden baseline storage and comparison
  parsers/
    viewgraph-v2.js      ViewGraph v2 JSON parser (full, summary, metadata levels)
  analysis/
    node-queries.js      Flatten, filter, query nodes from parsed captures
    a11y-rules.js        Accessibility audit rules
    contrast.js          WCAG color contrast computation
    layout-analysis.js   Overlap/overflow/viewport detection
    capture-diff.js      Structural diff between two captures
    fidelity.js          Capture vs HTML snapshot fidelity comparison
    annotation-diff.js   Cross-capture annotation tracking
    recurring-issues.js  UI hot spot detection across captures
    source-linker.js     DOM element to source file mapping
    consistency-checker.js  Cross-page style consistency analysis
    screenshot-diff.js   Pixel-by-pixel screenshot comparison
    spec-generator.js    Annotation-to-Kiro-spec pipeline
    state-machine.js     Session-to-Mermaid state diagram builder
    steering-generator.js  Pattern-based steering doc generation
  tools/
    (34 files - one per MCP tool)
  utils/
    validate-path.js     Path traversal prevention
    tool-helpers.js      Shared validate-read-parse helper for tool handlers
```

Imports use `#src/` subpath aliases (Node.js native, no build step).
