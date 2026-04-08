# ViewGraph

**The UI context layer for agentic coding.**

Browser extension + MCP server for AI-powered UI capture, auditing, and annotation.

ViewGraph captures structured DOM snapshots from any web page and exposes them to AI coding assistants via the [Model Context Protocol](https://modelcontextprotocol.io/). Agents can query page structure, audit accessibility, find missing test IDs, compare captures, and act on human annotations - all through MCP tools.

Works with any MCP-compatible agent: **Kiro**, **Claude Code**, **Cursor**, **Windsurf**, **Cline**, **Aider**, and more. No agent-specific code - pure MCP protocol. Tools that don't support MCP can read `.viewgraph.json` capture files directly from disk.

## Components

| Component | Description | Status |
|---|---|---|
| [`server/`](./server/) | MCP server - reads capture files, exposes 11 query/analysis tools | M1+M2 Complete |
| [`extension/`](./extension/) | Firefox/Chrome extension - captures DOM, screenshots, annotations | Scaffolded |

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
npm test               # all tests (85 tests, 19 files)
npm run test:server    # server only
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
- [Spec Index](./.kiro/specs/README.md) - Kiro specs, ADRs, architecture docs
- [ViewGraph v2 Format Spec](./docs/architecture/viewgraph-v2-format.md) - capture format (v2.1.0)
- [Format Research](./docs/architecture/viewgraph-format-research.md) - format analysis and design rationale
- [Scans and Recommendations](./docs/architecture/scans-and-recommendations.md) - 22 automated scans
- [Universal Agent Integration](./docs/decisions/ADR-001-universal-agent-integration.md) - multi-tool architecture (Kiro, Claude Code, Cursor, Windsurf)
- [Multi-Project Routing](./docs/decisions/ADR-002-multi-project-capture-routing.md) - how the extension routes captures to the right project

## License

MIT
