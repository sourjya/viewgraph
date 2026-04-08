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
| [`extension/`](./extension/) | Chrome/Firefox extension - DOM capture, unified annotate, multi-export | M4+M5+M6+M7b+M7c Complete |

## How It Works

ViewGraph is a standalone tool that runs alongside your project - it doesn't embed into your codebase or require any changes to your application. It works with any web app regardless of the backend technology (Python, Ruby, Java, Go, PHP, etc.).

```
Your app (any language) --> serves HTML --> Chrome renders it --> Extension captures DOM
                                                                        |
                                                                        v
Kiro / Claude / Cursor  <-- MCP protocol <-- ViewGraph server <-- .viewgraph.json files
```

**What you need on your machine:**

| Component | Purpose |
|---|---|
| Node.js 18+ | Runs the ViewGraph MCP server (not part of your project) |
| Chrome 116+ | Runs the ViewGraph browser extension |
| Your language runtime | Runs your actual application (Python, Node, etc.) |

**Setup for any project:**

1. Install ViewGraph once (clone this repo, `npm install`) - this is the only place Node.js is needed
2. Register the MCP server in your AI agent's config (e.g., `.kiro/settings/mcp.json`)
3. Install the browser extension in Chrome
4. Open your app in Chrome - your app serves HTML to the browser like any web app
5. Capture and annotate - the extension captures what's in the browser, pushes to the MCP server
6. Your AI agent queries captures via MCP tools - reads the JSON files, doesn't care what backend generated the HTML

The ViewGraph server never touches your application code. It only reads `.viewgraph.json` capture files. Your project just needs a small MCP config file pointing to the ViewGraph server:

```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "node",
      "args": ["/path/to/viewgraph/server/index.js"],
      "env": { "VIEWGRAPH_CAPTURES_DIR": ".viewgraph/captures" }
    }
  }
}
```

## Getting Started

### Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Node.js | 18.0.0+ (LTS) | Required for ES modules and MCP SDK |
| npm | 9.0.0+ | Workspaces support required |
| Chrome | 116+ | Manifest V3 service worker support |
| Firefox | 109+ | Manifest V3 support (build with `--browser firefox`) |

### Key Dependencies

| Package | Version | Used In |
|---|---|---|
| `@modelcontextprotocol/sdk` | ^1.29.0 | Server - MCP protocol |
| `zod` | ^3.x | Server - input validation |
| `wxt` | ^0.20.20 | Extension - build framework |
| `vitest` | ^4.1.3 | Both - test runner |

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
4. Click **Annotate** - enters annotation mode where you can:
   - **Click** any element to select it and add a comment
   - **Shift+drag** to select a region and add a comment
   - **Scroll wheel** to navigate up/down the DOM tree while hovering
   - Use the sidebar to manage, resolve, or delete annotations
   - Click **Send to Kiro** to push all annotations with context to your AI agent
   - Click **Copy MD** to copy a markdown bug report to clipboard
   - Click **Report** to download a ZIP with markdown + cropped screenshots

Captures are saved to `.viewgraph/captures/` and pushed to the MCP server automatically.

### 6. Query captures via MCP

Your AI agent can now use ViewGraph tools:

```
> list_captures
> get_page_summary filename="viewgraph-localhost-20260408-120612.json"
> audit_accessibility filename="viewgraph-localhost-20260408-120612.json"
> find_missing_testids filename="viewgraph-localhost-20260408-120612.json"
```

### 7. Try the demo

Open [`docs/demo/index.html`](./docs/demo/) in Chrome - a styled login page with 8 planted UI bugs. Annotate the issues, send to Kiro, and watch them get fixed. See the [demo walkthrough](./docs/demo/README.md) for step-by-step instructions.

## Workflows

### For developers with AI agents

1. Open your app in Chrome, click **Annotate** in the ViewGraph popup
2. Click elements or shift+drag regions, add comments describing what to fix
3. Click **Send to Kiro** - annotations bundle with the full DOM capture
4. In your AI agent, ask about the annotations - it has full DOM context to implement fixes

### For testers and reviewers

ViewGraph works without an AI agent. Testers annotate the UI the same way, then export their notes:

1. Open the app in Chrome, click **Annotate**
2. Click or shift+drag to select problem areas, add comments
3. Export your review:
   - **Copy Markdown** - copies a structured bug report to clipboard, paste into Jira/Linear/GitHub
   - **Download Report** - saves a ZIP with markdown report + cropped screenshots per annotation

No MCP server needed. No AI agent needed. The extension works standalone for anyone who needs to document UI issues.

### For teams

A tester annotates and exports to markdown. A developer annotates and sends to Kiro. Both use the same tool, same workflow, same annotation format. The only difference is where the notes go.

## Development

```bash
npm run dev:server     # start MCP server with file watcher
npm run dev:ext        # start extension dev server (Chrome HMR)
```

## Testing

```bash
npm test               # all tests (232 tests)
npm run test:server    # server only (131 tests)
npm run test:ext       # extension only (101 tests)
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
