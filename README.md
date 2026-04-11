<p align="center">
  <img src="docs/logos/viewgraph-logo.png" alt="ViewGraph" width="420">
</p>

<p align="center"><strong>The UI context layer for agentic coding.</strong></p>

Browser extension + MCP server for AI-powered UI capture, auditing, and annotation.

ViewGraph captures structured DOM snapshots from any web page and exposes them to AI coding assistants via the [Model Context Protocol](https://modelcontextprotocol.io/). Agents can query page structure, audit accessibility, find missing test IDs, compare captures, track regressions, and act on human annotations - all through 34 MCP tools.

Works with any MCP-compatible agent: **Kiro**, **Claude Code**, **Cursor**, **Windsurf**, **Cline**, **Aider**, and more. No agent-specific code - pure MCP protocol. Tools that don't support MCP can read `.viewgraph.json` capture files directly from disk.

## Components

| Component | Description |
|---|---|
| [`server/`](./server/) | MCP server - 34 query/analysis/request tools, WebSocket collab, baselines |
| [`extension/`](./extension/) | Chrome/Firefox extension - DOM capture, annotate, 14 enrichment collectors, multi-export |
| [`power/`](./power/) | Kiro Power assets - 3 hooks, 7 prompts, 3 steering docs, MCP config |

## How It Works

ViewGraph runs alongside your project as a standalone tool. It does not embed into your codebase or require changes to your application. It works with any web app regardless of backend technology (Python, Ruby, Java, Go, PHP, etc.).

```
Your app (any language) --> serves HTML --> Chrome renders it --> Extension captures DOM
                                                                        |
                                                                        v
Kiro / Claude / Cursor  <-- MCP protocol <-- ViewGraph server <-- .viewgraph.json files
```

The extension captures the DOM. The server reads those capture files and exposes them to your AI agent via MCP. Your agent never touches your app directly - it reads the structured capture data.

## Getting Started

### Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Node.js | 18.0.0+ (LTS) | Runs the ViewGraph server and builds the extension |
| npm | 9.0.0+ | Workspaces support required |
| Chrome | 116+ | Required for the browser extension (Manifest V3) |

> **Firefox:** supported but not recommended for development. Build with `npm run build:ext -- --browser firefox` from the ViewGraph root. See [extension/README.md](./extension/) for details.

### Step 1: Clone and install ViewGraph

```bash
git clone https://github.com/sourjya/viewgraph.git
cd viewgraph
npm install
```

This installs dependencies for both the server and extension via npm workspaces. You only need Node.js here - your actual project can use any language.

### Step 2: Build and load the browser extension

Build the extension:

```bash
npm run build:ext
```

Then load it into Chrome:

1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select: `<your-viewgraph-path>/extension/.output/chrome-mv3`
5. The ViewGraph icon appears in your Chrome toolbar

### Step 3: Initialize ViewGraph in your project

Open a terminal in **your project's root directory** (not the ViewGraph directory) and run:

```bash
node /path/to/viewgraph/scripts/viewgraph-init.js
```

The init script does the following automatically:
- Detects your AI agent (Kiro, Claude Code, Cursor, etc.) and writes the appropriate MCP config file
- Creates `.viewgraph/captures/` for storing capture files
- Generates an auth token at `.viewgraph/.token` for secure extension-to-server communication
- Installs Kiro Power assets (hooks, prompts, steering docs) if using Kiro
- Starts the MCP server as a background process

**How to verify it worked:** The extension sidebar shows a green dot when connected to the server. Click the ViewGraph toolbar icon on any page to check.

### Step 4: Capture and annotate

1. Navigate to your app in Chrome
2. Click the **ViewGraph** toolbar icon - annotate mode activates
3. The sidebar opens with two tabs: **Review** (annotations) and **Inspect** (diagnostics)

**Annotating:**
- **Click** any element to select it and add a comment
- **Shift+drag** to select a region
- **Scroll wheel** while hovering to navigate up/down the DOM tree
- Set **severity** and **category** on each annotation via the floating panel

**Exporting:**
- **Send to Agent** - pushes annotations + full DOM capture to your AI agent via MCP
- **Copy MD** - copies a markdown bug report to clipboard (includes network/console data)
- **Report** - downloads a ZIP with markdown, screenshots, network.json, and console.json

Captures are saved to `.viewgraph/captures/` in your project and pushed to the MCP server automatically.

### Step 5: Let your AI agent act on captures

Your AI agent can now query captures through MCP. You don't call these tools directly - your agent does. Example prompts you'd give your agent:

```
"Audit the latest capture for accessibility issues"
"Find all buttons missing data-testid"
"Fix the annotations from my last review"
```

Behind the scenes, the agent calls tools like `audit_accessibility`, `find_missing_testids`, and `get_annotations`.

### Starting the server in subsequent sessions

The init script starts the server automatically on first run. For later sessions:

```bash
npm run dev:server       # run from the ViewGraph directory
```

Or re-run the init script from your project - it kills any stale server and starts a fresh one.

### Try the demo

Open [`docs/demo/index.html`](./docs/demo/) in Chrome - a styled login page with 8 planted UI bugs. Annotate the issues, send to Kiro, and watch them get fixed. See the [demo walkthrough](./docs/demo/README.md) for step-by-step instructions.

## Workflows

### For developers with AI agents

1. Open your app in Chrome, click the **ViewGraph** icon
2. Click elements or shift+drag regions, add comments describing what to fix
3. Check the **Inspect** tab for network errors or console issues
4. Click **Send to Agent** - annotations bundle with the full DOM capture + enrichment data
5. Ask your agent to fix the issues - it has full DOM context

### For testers and reviewers (no AI agent needed)

The extension works standalone. No MCP server required.

1. Open the app in Chrome, click the **ViewGraph** icon
2. Click or shift+drag to select problem areas, add comments
3. Export:
   - **Copy Markdown** - paste into Jira/Linear/GitHub (includes network failures, console errors, viewport breakpoint)
   - **Download Report** - ZIP with markdown, screenshots, network.json, console.json

### For teams

A tester annotates and exports to markdown. A developer annotates and sends to Kiro. Same tool, same workflow, same format - the only difference is where the notes go.

## Kiro Power: Hooks and Prompts

When you run `viewgraph-init.js` in a Kiro project, ViewGraph installs hooks, prompts, and steering docs that automate common workflows. These work in both Kiro IDE and Kiro CLI.

### Hooks (installed automatically by init script)

| Hook | Trigger | What it does |
|---|---|---|
| **Capture and Audit Page** | Manual (IDE sidebar) or `@vg-audit` (CLI) | Captures the current page, runs a11y audit, checks for missing testids. Summarizes all issues by severity. |
| **Fix ViewGraph Annotations** | Manual (IDE sidebar) or `@vg-review` (CLI) | Pulls unresolved annotations, maps them to source files, implements fixes in sequence, marks each resolved. |
| **Check TestID Coverage** | Auto on UI file edit | When you edit `.html`, `.jsx`, `.tsx`, `.vue`, `.svelte`, or `.css` files, checks if interactive elements in recent captures are missing `data-testid`. |

### CLI prompt shortcuts

In Kiro CLI, type `@vg` then Tab to see all shortcuts:

| Shortcut | Workflow |
|---|---|
| `@vg-audit` | Full audit: a11y + layout + testids |
| `@vg-review` | Fix all annotations from latest capture |
| `@vg-capture <url>` | Request fresh capture, summarize result |
| `@vg-diff` | Compare two most recent captures |
| `@vg-testids` | Find and add missing data-testid attributes |
| `@vg-a11y` | Deep a11y audit with automatic source fixes |

### Other agents

ViewGraph works with any MCP-compatible agent via the standard MCP protocol. The tools are the same regardless of agent. Dedicated Power packages (steering docs, hooks) for Claude Code, Cursor, Windsurf, and Cline are coming soon.

## MCP Tools (34)

These tools are called by your AI agent, not by you directly. The agent discovers them automatically via the MCP protocol.

### Core (4 tools)

| Tool | Description |
|---|---|
| `list_captures` | List available captures with URL filter and limit |
| `get_capture` | Retrieve full capture JSON by filename |
| `get_latest_capture` | Most recent capture (summary if >100KB) |
| `get_page_summary` | Compact summary: URL, title, viewport, element counts, clusters |

### Analysis (8 tools)

| Tool | Description |
|---|---|
| `get_elements_by_role` | Filter nodes by role: buttons, links, inputs, headings, etc. |
| `get_interactive_elements` | All clickable/editable elements with selectors and labels |
| `find_missing_testids` | Interactive elements lacking data-testid, with suggestions |
| `audit_accessibility` | A11y audit: missing aria-labels, alt text, form labels, contrast ratios, axe-core results |
| `audit_layout` | Layout audit: element overflow, sibling overlap, viewport overflow |
| `compare_captures` | Diff two captures: added/removed elements, layout shifts, testid changes |
| `get_annotations` | Human annotations from review-mode captures |
| `get_annotation_context` | Capture filtered to annotated nodes + comments |

### Bidirectional (3 tools)

| Tool | Description |
|---|---|
| `request_capture` | Request a capture from the browser extension (purpose: capture/inspect/verify) |
| `get_request_status` | Poll for capture request completion |
| `get_fidelity_report` | Compare capture against HTML snapshot for fidelity metrics |

### Baseline and Regression (3 tools)

| Tool | Description |
|---|---|
| `set_baseline` | Promote a capture to golden baseline for its URL |
| `compare_baseline` | Diff latest capture vs baseline - detect structural regressions |
| `list_baselines` | List all stored baselines with metadata |

### Annotation Intelligence (7 tools)

| Tool | Description |
|---|---|
| `resolve_annotation` | Mark annotation as fixed/wontfix/duplicate/invalid |
| `get_unresolved` | Unresolved annotations from one or all captures |
| `check_annotation_status` | Compare annotations against newer capture to detect resolved issues |
| `diff_annotations` | Track persistent issues across multiple captures |
| `detect_recurring_issues` | Find UI elements flagged repeatedly across captures |
| `analyze_patterns` | Detect recurring issue patterns from resolved annotations |
| `generate_spec` | Generate Kiro spec (requirements + tasks) from annotations |

### Session and Journey (5 tools)

| Tool | Description |
|---|---|
| `list_sessions` | List capture sessions (grouped user journeys) |
| `get_session` | Full step sequence for a capture session |
| `analyze_journey` | Analyze recorded user journey for issues across steps |
| `visualize_flow` | Build Mermaid state machine diagram from session |
| `get_capture_stats` | Aggregate statistics across all captures |

### Source and Quality (4 tools)

| Tool | Description |
|---|---|
| `find_source` | Find source file that renders a DOM element |
| `check_consistency` | Compare elements across pages for style inconsistencies |
| `compare_screenshots` | Pixel-by-pixel screenshot comparison |
| `validate_capture` | Check capture for quality issues (empty pages, missing data) |

## Troubleshooting

| Problem | Solution |
|---|---|
| Extension icon doesn't appear | Check `chrome://extensions/` - is it enabled? Is Developer mode on? |
| Sidebar shows no green dot | Server isn't running. Run `npm run dev:server` from the ViewGraph directory, or re-run the init script from your project. |
| "Send to Agent" does nothing | Check the sidebar connection status. The server must be running and the auth token must match. |
| Captures not appearing in agent | Verify `.viewgraph/captures/` exists in your project and the MCP config points to the right path. Run `node scripts/viewgraph-status.js` from the ViewGraph directory for a full health check. |
| Firefox extension won't load | Firefox requires a signed extension or `about:config` > `xpinstall.signatures.required` = false. For development, use Chrome. |

## Development

All commands run from the ViewGraph root directory:

```bash
npm run dev:server     # start MCP server with file watcher
npm run dev:ext        # start extension dev server (Chrome HMR)
npm test               # all tests (923 tests)
npm run test:server    # server only (324 tests)
npm run test:ext       # extension only (599 tests)
```

## Project Structure

```
server/          MCP server (Node.js, @modelcontextprotocol/sdk)
  src/
    tools/       34 MCP tool handlers
    analysis/    14 analysis modules (a11y, layout, diff, fidelity, source linking, etc.)
    parsers/     ViewGraph v2 JSON parser
    utils/       Path validation, tool helpers
extension/       Browser extension (WXT, Manifest V3)
  lib/           42 modules (annotate, collectors, export, session, ws-client, etc.)
  entrypoints/   background, content, popup, options
power/           Kiro Power assets (steering docs, hooks, prompts)
docs/            Documentation, architecture, decisions, changelogs
scripts/         Git scripts, build scripts, init, status, doctor
.kiro/           Specs, steering docs, hooks
```

## Documentation

- [Roadmap](./docs/roadmap/roadmap.md) - milestone plan and completion status
- [Security Assessment](./docs/architecture/security-assessment.md) - threat model and mitigations
- [Spec Index](./.kiro/specs/README.md) - Kiro specs, ADRs, architecture docs
- [ViewGraph v2 Format Spec](./docs/architecture/viewgraph-v2-format.md) - capture format (v2.1.0)
- [Format Research](./docs/architecture/viewgraph-format-research.md) - format analysis and design rationale
- [Scans and Recommendations](./docs/architecture/scans-and-recommendations.md) - 22 automated scans
- [UX Design](./docs/architecture/ux-analysis.md) - two-tab sidebar model, design decisions, user journeys
- [Universal Agent Integration](./docs/decisions/ADR-001-universal-agent-integration.md) - multi-tool architecture
- [Multi-Project Routing](./docs/decisions/ADR-002-multi-project-capture-routing.md) - capture routing
- [Kiro Power Packaging](./docs/decisions/ADR-008-kiro-power-packaging.md) - Power packaging decision
- [AGPL Licensing](./docs/decisions/ADR-009-agpl-licensing.md) - licensing rationale

## License

AGPL-3.0 - see [COPYING](COPYING) for the full license text.

Copyright (c) 2026 Sourjya S. Sen. See [ADR-009](docs/decisions/ADR-009-agpl-licensing.md) for licensing rationale.
