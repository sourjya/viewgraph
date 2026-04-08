<p align="center">
  <img src="docs/logos/viewgraph-logo.png" alt="ViewGraph" width="420">
</p>

<p align="center"><strong>The UI context layer for agentic coding.</strong></p>

Browser extension + MCP server for AI-powered UI capture, auditing, and annotation.

ViewGraph captures structured DOM snapshots from any web page and exposes them to AI coding assistants via the [Model Context Protocol](https://modelcontextprotocol.io/). Agents can query page structure, audit accessibility, find missing test IDs, compare captures, and act on human annotations - all through MCP tools.

Works with any MCP-compatible agent: **Kiro**, **Claude Code**, **Cursor**, **Windsurf**, **Cline**, **Aider**, and more. No agent-specific code - pure MCP protocol. Tools that don't support MCP can read `.viewgraph.json` capture files directly from disk.

## Components

| Component | Description | Status |
|---|---|---|
| [`server/`](./server/) | MCP server - reads capture files, exposes 15 query/analysis/request tools | M1+M2+M3 Complete |
| [`extension/`](./extension/) | Chrome/Firefox extension - DOM capture, inspector, annotations | M4+M5+M6 Complete |

## Getting Started

### Prerequisites

- Node.js 18+ (LTS)
- npm
- Chrome (for extension development)

### 1. Clone and install

```bash
git clone https://github.com/sourjya/viewgraph.git
cd viewgraph
npm install
```

This installs dependencies for both the server and extension workspaces.

### 2. Build the extension

```bash
npm run build:ext
```

The built extension is output to `extension/.output/chrome-mv3/`.

### 3. Load the extension in Chrome

1. Open `chrome://extensions/` in Chrome
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the folder: `<your-path>/viewgraph/extension/.output/chrome-mv3`
5. The ViewGraph icon appears in your toolbar

### 4. Start the MCP server

```bash
npm run dev:server
```

The server starts on stdio (for MCP) and an HTTP receiver on `localhost:9876` (for the extension). You'll see a shared secret token logged - configure this in the extension options if you want authenticated pushes.

### 5. Capture a page

1. Navigate to any web page in Chrome
2. Click the **ViewGraph** icon in the toolbar
3. Click **Capture** - captures the full page DOM as ViewGraph JSON
4. Click **Inspect** - hover over elements to see structure, click to freeze, then:
   - Camera icon: capture the selected element's subtree
   - Clipboard icon: copy the best CSS selector to clipboard
   - X icon: cancel

Captures are saved to `.viewgraph/captures/` and pushed to the MCP server automatically.

### 6. Query captures via MCP

Your AI agent can now use ViewGraph tools:

```
> list_captures
> get_page_summary filename="viewgraph-localhost-20260408-120612.json"
> audit_accessibility filename="viewgraph-localhost-20260408-120612.json"
> find_missing_testids filename="viewgraph-localhost-20260408-120612.json"
```

## Development

```bash
npm run dev:server     # start MCP server with file watcher
npm run dev:ext        # start extension dev server (Chrome HMR)
```

## Testing

```bash
npm test               # all tests (228 tests, 32 files)
npm run test:server    # server only (128 tests)
npm run test:ext       # extension only (100 tests)
```

## MCP Tools

### Core Tools (M1)

| Tool | Description |
|---|---|
| `list_captures` | List available captures with URL filter and limit |
| `get_capture` | Retrieve full capture JSON by filename |
| `get_latest_capture` | Most recent capture (summary if >100KB) |
| `get_page_summary` | Compact summary: URL, title, viewport, element counts, clusters |

### Analysis Tools (M2)

| Tool | Description |
|---|---|
| `get_elements_by_role` | Filter nodes by role: buttons, links, inputs, headings, etc. |
| `get_interactive_elements` | All clickable/editable elements with selectors and labels |
| `find_missing_testids` | Interactive elements lacking data-testid, with suggestions |
| `audit_accessibility` | A11y audit: missing aria-labels, alt text, form labels |
| `compare_captures` | Diff two captures: added/removed elements, layout shifts, testid changes |
| `get_annotations` | Human annotations from review-mode captures |
| `get_annotated_capture` | Capture filtered to annotated nodes + comments |

### Bidirectional Tools (M3)

| Tool | Description |
|---|---|
| `request_capture` | Request a capture from the browser extension |
| `get_request_status` | Poll for capture request completion |
| `get_fidelity_report` | Compare capture against HTML snapshot for fidelity metrics |

## Project Structure

```
server/          MCP server (Node.js, @modelcontextprotocol/sdk)
extension/       Browser extension (WXT, Manifest V3)
docs/            Documentation, architecture, decisions, changelogs
.kiro/           Specs, steering docs, hooks
scripts/         Git and build scripts
```

## Documentation

- [Roadmap](./docs/roadmap/roadmap.md) - milestone plan (9 milestones)
- [Security Assessment](./docs/architecture/security-assessment.md) - threat model and mitigations
- [Spec Index](./.kiro/specs/README.md) - Kiro specs, ADRs, architecture docs
- [ViewGraph v2 Format Spec](./docs/architecture/viewgraph-v2-format.md) - capture format (v2.1.0)
- [Format Research](./docs/architecture/viewgraph-format-research.md) - format analysis and design rationale
- [Scans and Recommendations](./docs/architecture/scans-and-recommendations.md) - 22 automated scans
- [Universal Agent Integration](./docs/decisions/ADR-001-universal-agent-integration.md) - multi-tool architecture
- [Multi-Project Routing](./docs/decisions/ADR-002-multi-project-capture-routing.md) - capture routing

## License

MIT
