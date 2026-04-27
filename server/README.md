# ViewGraph MCP Server

MCP server that reads ViewGraph capture files from disk and exposes 38 query/analysis/request tools to AI coding assistants via the [Model Context Protocol](https://modelcontextprotocol.io/).

Works with any MCP-compatible agent: Kiro, Claude Code, Cursor, Windsurf, Cline, Aider.

**[Documentation](https://chaoslabz.gitbook.io/viewgraph)** - **[Quick Start](https://chaoslabz.gitbook.io/viewgraph/getting-started/quick-start)** - **[GitHub](https://github.com/sourjya/viewgraph)**

## Quick Start

Add to your AI agent's MCP config:

```json
{
  "mcpServers": {
    "viewgraph": { "command": "npx", "args": ["-y", "@viewgraph/core"] }
  }
}
```

The server runs automatically via `npx`, auto-creates `.viewgraph/captures/`, and learns your URL pattern from the first capture. No `viewgraph-init` needed.

**Alternative:** `npm install -g @viewgraph/core` for explicit version pinning, then run `viewgraph-init` from each project folder to configure URL patterns and capture routing.

## Tools (38)

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

### Archive (1)

| Tool | Description |
|---|---|
| `list_archived` | List archived captures with URL, date range, and limit filters |

### Source and Quality (4)

| Tool | Description |
|---|---|
| `find_source` | Find source file that renders a DOM element (testid/label grep) |
| `check_consistency` | Compare elements across pages for style inconsistencies |
| `compare_screenshots` | Pixel-by-pixel screenshot comparison |
| `validate_capture` | Check capture for quality issues (empty pages, missing data) |

## Running the Server

All commands run from the **ViewGraph root directory** (not `server/`):

```bash
npm run dev:server       # recommended - starts with file watcher for auto-reload
```

Or run the entry point directly from the `server/` directory:

```bash
node index.js            # no file watcher, no auto-reload
```

The server uses stdio transport for MCP communication (your agent connects via this) and starts an HTTP receiver on `localhost:9876` for extension communication. A WebSocket server runs alongside for real-time annotation sync.

## Configuration

The init script handles configuration automatically. These details are for manual setup or troubleshooting.

### Captures directory

The server needs to know where capture files are stored. It checks these sources in order:

1. `VIEWGRAPH_CAPTURES_DIR` environment variable (highest priority)
2. `capturesDir` field in `.viewgraphrc.json` in the ViewGraph project root
3. Falls back to `.viewgraph/captures` relative to the working directory

```bash
# Option 1: Environment variable
export VIEWGRAPH_CAPTURES_DIR=/path/to/your-project/.viewgraph/captures

# Option 2: Config file (created by init script)
```

`.viewgraphrc.json` example:

```json
{
  "capturesDir": ".viewgraph/captures",
  "allowedDirs": [
    "/home/user/project-a/.viewgraph/captures",
    "/home/user/project-b/.viewgraph/captures"
  ]
}
```

The `allowedDirs` array is for multi-project setups where one server handles captures from multiple projects. The init script auto-registers each project here.

### Authentication

Zero-config by default:

- The server auto-generates a random UUID token at startup and writes it to `.viewgraph/.token` (mode 0600)
- The extension reads this token via the `/info` endpoint and includes it as a `Bearer` header on all POST requests
- No manual setup needed

To use a fixed token (useful for CI or shared environments), set:

```bash
export VIEWGRAPH_HTTP_SECRET=your-fixed-token
```

All POST endpoints require auth. GET endpoints (`/health`, `/info`, `/requests/pending`) remain open.

### Port fallback

The HTTP receiver defaults to port 9876. If that port is in use, it tries 9877, 9878, 9879 before failing. The extension auto-discovers the server by probing these ports.

## HTTP Endpoints

These are used by the extension, not by end users directly.

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Server status, captures dir, writability |
| `/info` | GET | Project info for auto-detection (capturesDir, projectRoot) |
| `/captures` | GET | List captures, optional URL filter |
| `/captures/compare` | GET | Diff two captures by filename (a, b params) |
| `/captures` | POST | Receive capture JSON from extension |
| `/snapshots` | POST | Receive HTML snapshots from extension |
| `/baselines` | POST | Promote a capture to golden baseline |
| `/requests/pending` | GET | Pending capture requests for extension polling |
| `/requests/:id/ack` | POST | Acknowledge a capture request |
| `/requests/:id/decline` | POST | Decline a capture request (optional reason in body) |
| `/annotations/resolved` | GET | Resolved annotations for extension sync |

### WebSocket

`ws://localhost:{port}/ws` - real-time annotation sync. The extension connects when the sidebar opens and receives live updates when annotations are created, updated, or resolved.

## Testing

Run from the **ViewGraph root directory**:

```bash
npm run test:server      # 514 tests
npm run test:server -- --watch   # watch mode
```

Or from the `server/` directory:

```bash
npm test                 # same 514 tests
```

## Slim Mode

For agents that only need basic browser context, start with `--slim`:

```json
{
  "mcpServers": {
    "viewgraph": { "command": "npx", "args": ["-y", "@viewgraph/core", "--slim"] }
  }
}
```

Exposes 9 core tools (`list_captures`, `get_capture`, `get_latest_capture`, `get_page_summary`, `get_session_status`, `audit_accessibility`, `audit_layout`, `find_missing_testids`, `get_interactive_elements`). All other tools are hidden.

## MCP Prompts

The server exposes all 11 prompt shortcuts via the MCP `prompts/list` capability. Agents discover `vg-review`, `vg-audit`, `vg-debug-ui`, and all other shortcuts automatically as first-class prompt templates.

## Extension Compatibility

The server is compatible with the M19 extension release, which moved all HTTP communication to the service worker. No server-side changes are needed - the same HTTP and WebSocket endpoints work regardless of whether requests originate from the content script or service worker.

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
