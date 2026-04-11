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
| [`server/`](./server/) | MCP server - reads capture files, exposes 33 query/analysis/request tools | M1+M2+M3+M15.2 Complete |
| [`extension/`](./extension/) | Chrome/Firefox extension - DOM capture, unified annotate, multi-export, enrichment | M4+M5+M6+M7b+M7c+M11+M12 Complete |
| [`power/`](./power/) | Kiro Power assets - POWER.md, steering docs, hooks, MCP config | M8b Complete |

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
2. Install the browser extension in Chrome (build with `npm run build:ext`, load unpacked)
3. Run `node /path/to/viewgraph/scripts/viewgraph-init.js` from your project root - auto-detects your AI agent, writes MCP config, and starts the server
4. Open your app in Chrome, annotate, and send - captures route to the right project folder
5. Your AI agent queries captures via MCP tools - reads the JSON files, doesn't care what backend generated the HTML

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

### 4. Initialize in your project

From your project root (not the ViewGraph directory):

```bash
node /path/to/viewgraph/scripts/viewgraph-init.js
```

This auto-detects your AI agent, writes MCP config, creates `.viewgraph/captures/`, installs Power assets (Kiro steering docs + hooks), kills any stale server, and starts a fresh detached server. The server auto-generates an auth token (written to `.viewgraph/.token`) - the extension picks it up automatically via the `/info` endpoint. No manual config needed.

The extension sidebar shows a green dot when connected and auto-detects the project mapping via the server's `/info` endpoint.

For subsequent sessions, start the server directly:

```bash
npm run dev:server
```

### 5. Capture a page

1. Navigate to any web page in Chrome
2. Click the **ViewGraph** icon in the toolbar - annotate mode activates directly
3. The sidebar opens with two tabs: **Review** (annotations) and **Inspect** (page diagnostics)
4. **Click** any element to select it and add a comment
5. **Shift+drag** to select a region and add a comment
6. **Scroll wheel** to navigate up/down the DOM tree while hovering
7. Set **severity** and **category** on each annotation via the floating panel
8. Use the sidebar to filter (All/Open/Resolved), resolve, or delete annotations
9. Switch to the **Inspect** tab to see network requests, console errors, breakpoint info, and visibility warnings
10. Export:
    - **Send to Agent** - push annotations with full DOM context + enrichment data to your AI agent
    - **Copy MD** - copy a markdown bug report to clipboard (includes environment section with network/console data)
    - **Report** - download a ZIP with markdown, cropped screenshots, network.json, and console.json
11. **Page Note** adds a page-level comment (labeled P1, P2, etc. - separate from element numbering)

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

1. Open your app in Chrome, click the **ViewGraph** icon to enter annotate mode
2. Click elements or shift+drag regions, add comments describing what to fix
3. Check the **Inspect** tab for network errors or console issues related to the bug
4. Click **Send to Agent** - annotations bundle with the full DOM capture + enrichment data
5. In your AI agent, ask about the annotations - it has full DOM context to implement fixes

### For testers and reviewers

ViewGraph works without an AI agent. Testers annotate the UI the same way, then export their notes:

1. Open the app in Chrome, click the **ViewGraph** icon
2. Click or shift+drag to select problem areas, add comments
3. Export your review:
   - **Copy Markdown** - copies a structured bug report to clipboard (includes environment data: network failures, console errors, viewport breakpoint), paste into Jira/Linear/GitHub
   - **Download Report** - saves a ZIP with markdown report, cropped screenshots, network.json, and console.json

No MCP server needed. No AI agent needed. The extension works standalone for anyone who needs to document UI issues.

### For teams

A tester annotates and exports to markdown. A developer annotates and sends to Kiro. Both use the same tool, same workflow, same annotation format. The only difference is where the notes go.

## Kiro Power: Hooks and Prompts

When you run `viewgraph-init.js` in a Kiro project, ViewGraph installs hooks, prompts, and steering docs that automate common workflows. These work in both Kiro IDE and Kiro CLI.

### Hooks

| Hook | Trigger | What it does |
|---|---|---|
| **Capture and Audit Page** | Manual (IDE sidebar) or `@vg-audit` (CLI) | Captures the current page, runs a11y audit, checks for missing testids and aria-labels. Summarizes all issues by severity. |
| **Fix ViewGraph Annotations** | Manual (IDE sidebar) or `@vg-review` (CLI) | Pulls unresolved annotations, maps them to source files, implements fixes in sequence, marks each resolved. |
| **Check TestID Coverage** | Auto on UI file edit | When you edit `.html`, `.jsx`, `.tsx`, `.vue`, `.svelte`, or `.css` files, checks if interactive elements in recent captures are missing `data-testid`. |

**In Kiro IDE:** Trigger manual hooks from the **Agent Hooks** section in the sidebar. The annotation hook is the most powerful - annotate issues in the browser, click the hook, and Kiro fixes them all in sequence.

**In Kiro CLI:** Use the `@vg-` prompt shortcuts (type `@vg` then Tab to see all):

| Shortcut | Workflow |
|---|---|
| `@vg-audit` | Full audit: a11y + layout + testids |
| `@vg-review` | Fix all annotations from latest capture |
| `@vg-capture <url>` | Request fresh capture, summarize result |
| `@vg-diff` | Compare two most recent captures |
| `@vg-testids` | Find and add missing data-testid attributes |
| `@vg-a11y` | Deep a11y audit with automatic source fixes |

### Steering docs

Installed to `.kiro/steering/` - these guide the agent on when to use captures, how to resolve annotations, and the expected resolution format.

### Other agents

ViewGraph works with any MCP-compatible agent today via the standard MCP protocol. Dedicated Power packages (steering docs, hooks, prompt shortcuts) for Claude Code, Cursor, Windsurf, and Cline are coming soon.

## Development

```bash
npm run dev:server     # start MCP server with file watcher
npm run dev:ext        # start extension dev server (Chrome HMR)
```

## Testing

```bash
npm test               # all tests (905 tests)
npm run test:server    # server only (324 tests)
npm run test:ext       # extension only (581 tests)
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
| `audit_accessibility` | A11y audit: missing aria-labels, alt text, form labels, contrast ratios |
| `audit_layout` | Layout audit: element overflow, sibling overlap, viewport overflow |
| `compare_captures` | Diff two captures: added/removed elements, layout shifts, testid changes |
| `get_annotations` | Human annotations from review-mode captures |
| `get_annotation_context` | Capture filtered to annotated nodes + comments |

### Bidirectional Tools (M3)

| Tool | Description |
|---|---|
| `request_capture` | Request a capture from the browser extension (with optional purpose: capture/inspect/verify) |
| `get_request_status` | Poll for capture request completion (pending/acknowledged/completed/declined/expired) |
| `get_fidelity_report` | Compare capture against HTML snapshot for fidelity metrics |

### Baseline Tools (M15.2)

| Tool | Description |
|---|---|
| `set_baseline` | Promote a capture to golden baseline for its URL |
| `compare_baseline` | Diff latest capture vs baseline - detect structural regressions |
| `list_baselines` | List all stored baselines with metadata |

## Project Structure

```
server/          MCP server (Node.js, @modelcontextprotocol/sdk)
extension/       Browser extension (WXT, Manifest V3)
power/           Kiro Power assets (steering docs, hooks)
docs/            Documentation, architecture, decisions, changelogs
.kiro/           Specs, steering docs, hooks
scripts/         Git and build scripts
```

## Documentation

- [Roadmap](./docs/roadmap/roadmap.md) - milestone plan (10 milestones)
- [Security Assessment](./docs/architecture/security-assessment.md) - threat model and mitigations
- [Spec Index](./.kiro/specs/README.md) - Kiro specs, ADRs, architecture docs
- [ViewGraph v2 Format Spec](./docs/architecture/viewgraph-v2-format.md) - capture format (v2.1.0)
- [Format Research](./docs/architecture/viewgraph-format-research.md) - format analysis and design rationale
- [Scans and Recommendations](./docs/architecture/scans-and-recommendations.md) - 22 automated scans
- [UX Design](./docs/architecture/ux-analysis.md) - two-tab sidebar model, design decisions, user journeys
- [Universal Agent Integration](./docs/decisions/ADR-001-universal-agent-integration.md) - multi-tool architecture
- [Multi-Project Routing](./docs/decisions/ADR-002-multi-project-capture-routing.md) - capture routing
- [Kiro Power Packaging](./docs/decisions/ADR-008-kiro-power-packaging.md) - Power packaging decision

## License

AGPL-3.0 -- see [COPYING](COPYING) for the full license text.

Copyright (c) 2026 Sourjya S. Sen. See [ADR-009](docs/decisions/ADR-009-agpl-licensing.md) for licensing rationale.
