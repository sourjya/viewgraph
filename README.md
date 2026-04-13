<p align="center">
  <img src="docs/logos/viewgraph-logo.png" alt="ViewGraph" width="420">
</p>

<p align="center"><strong>The UI context layer for agentic coding.</strong></p>

<p align="center">
  <a href="https://chaoslabz.gitbook.io/viewgraph">Documentation</a> -
  <a href="https://chaoslabz.gitbook.io/viewgraph/getting-started/quick-start">Quick Start</a> -
  <a href="https://github.com/sourjya/viewgraph">GitHub</a> -
  <a href="https://www.npmjs.com/package/viewgraph">npm</a>
</p>

Browser extension + MCP server for AI-powered UI capture, auditing, and annotation.

ViewGraph captures structured DOM snapshots from any web page and exposes them to AI coding assistants via the [Model Context Protocol](https://modelcontextprotocol.io/). Agents can query page structure, audit accessibility, find missing test IDs, compare captures, track regressions, and act on human annotations - all through 34 MCP tools.

Works with any MCP-compatible agent: **Kiro**, **Claude Code**, **Cursor**, **Windsurf**, **Cline**, **Aider**, and more. No agent-specific code - pure MCP protocol. Tools that don't support MCP can read `.viewgraph.json` capture files directly from disk.

## Components

| Component | Description |
|---|---|
| [`server/`](./server/) | MCP server - 34 query/analysis/request tools, WebSocket collab, baselines |
| [`extension/`](./extension/) | Chrome/Firefox extension - DOM capture, annotate, 14 enrichment collectors, multi-export |
| [`packages/playwright/`](./packages/playwright/) | Playwright fixture - capture structured DOM snapshots during E2E tests |
| [`power/`](./power/) | Kiro Power assets - 3 hooks, 8 prompts, 3 steering docs, MCP config |

## How It Works

ViewGraph runs alongside your project as a standalone tool. It does not embed into your codebase or require changes to your application. It works with any web app regardless of backend technology (Python, Ruby, Java, Go, PHP, etc.).

```
Your app (any language) --> serves HTML --> Browser renders it --> Extension captures DOM
                                                                        |
                                                                        v
Kiro / Claude / Cursor  <-- MCP protocol <-- ViewGraph server <-- .viewgraph.json files
```

The extension captures the DOM from Chrome or Firefox. The server reads those capture files and exposes them to your AI agent via MCP. Your agent then uses this context to modify your source code - it never injects into or manipulates the running application directly.

## Getting Started

### Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Node.js | 18.0.0+ (LTS) | Runs the ViewGraph server and builds the extension |
| npm | 9.0.0+ | Workspaces support required |
| Chrome | 116+ | Manifest V3 browser extension |
| Firefox | 109+ | Manifest V3 browser extension |

Build for your browser of choice: `npm run build:ext` (Chrome, default) or `npm run build:ext -- --browser firefox`. See [extension/README.md](./extension/) for details.

### Step 1: Install ViewGraph

```bash
npm install viewgraph
```

<!-- TODO: Uncomment when store listings are approved
Or install the browser extension directly:
- [Chrome Web Store](https://chrome.google.com/webstore/detail/viewgraph-capture/PLACEHOLDER)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/viewgraph-capture/)
-->

### Step 2: Build and load the browser extension

Build the extension:

```bash
npm run build:ext                        # Chrome (default)
npm run build:ext -- --browser firefox   # Firefox
```

**Chrome:**
1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select: `<your-viewgraph-path>/extension/.output/chrome-mv3`

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file inside: `<your-viewgraph-path>/extension/.output/firefox-mv3`

The ViewGraph icon appears in your browser toolbar.

### Step 3: Initialize ViewGraph in your project

Open a terminal in **your project's root directory** and run:

```bash
npx viewgraph-init
```

The init script does the following automatically:
- Detects your AI agent (Kiro, Claude Code, Cursor, etc.) and writes the appropriate MCP config file
- Creates `.viewgraph/captures/` for storing capture files
- Generates an auth token at `.viewgraph/.token` for secure extension-to-server communication
- Installs Kiro Power assets (hooks, prompts, steering docs) if using Kiro
- Starts the MCP server as a background process

**How to verify it worked:** The extension sidebar shows a green dot when connected to the server. Click the ViewGraph toolbar icon on any page to check.

**Using a dev server or remote URL?** Add `--url` so the extension routes captures to the right project:

```bash
npx viewgraph-init --url localhost:3000
```

For multiple projects, multiple URLs, or editing patterns later, see the [Multi-Project Setup Guide](./docs/runbooks/multi-project-setup.md).

### Step 4: Capture and annotate

1. Navigate to your app in the browser
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

Open [`docs/demo/index.html`](./docs/demo/) in your browser - a styled login page with 8 planted UI bugs. Annotate the issues, send to Kiro, and watch them get fixed. See the [demo walkthrough](./docs/demo/README.md) for step-by-step instructions.

## Workflows

### For developers with AI agents

1. Open your app in the browser, click the **ViewGraph** icon
2. Click elements or shift+drag regions, add comments describing what to fix
3. Check the **Inspect** tab for network errors or console issues
4. Click **Send to Agent** - annotations bundle with the full DOM capture + enrichment data
5. Ask your agent to fix the issues - it has full DOM context

### For testers and reviewers (no AI agent needed)

The extension works standalone. No MCP server required.

1. Open the app in the browser, click the **ViewGraph** icon
2. Click or shift+drag to select problem areas, add comments
3. Export:
   - **Copy Markdown** - paste into Jira/Linear/GitHub (includes network failures, console errors, viewport breakpoint)
   - **Download Report** - ZIP with markdown, screenshots, network.json, console.json

### For teams

A tester annotates and exports to markdown. A developer annotates and sends to Kiro. Same tool, same workflow, same format - the only difference is where the notes go.

### For test automation teams

Capture structured DOM snapshots during Playwright E2E tests, or generate tests from browser captures:

- **Generate tests from captures:** Capture a page with the extension, ask your agent `@vg-tests` - it generates a complete Playwright test file with correct locators for every interactive element. 20-30 minutes of manual inspection reduced to one prompt.
- **Capture during tests:** Add `await viewgraph.capture('checkout-page')` to existing tests. The agent can then diff captures between runs, audit accessibility, and detect structural regressions.
- **Annotate from tests:** `await viewgraph.annotate('#email', 'Missing aria-label')` flags issues for the agent to fix with full DOM context.

See [`@viewgraph/playwright`](./packages/playwright/) for setup, API, and examples.

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
| `@vg-tests` | Generate Playwright E2E tests from capture |

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
| Extension icon doesn't appear | Check your browser's extension management page - is it enabled? |
| Sidebar shows no green dot | Server isn't running. Run `npm run dev:server` from the ViewGraph directory, or re-run the init script from your project. |
| "Send to Agent" does nothing | Check the sidebar connection status. The server must be running and the auth token must match. |
| Captures not appearing in agent | Verify `.viewgraph/captures/` exists in your project and the MCP config points to the right path. Run `node scripts/viewgraph-status.js` from the ViewGraph directory for a full health check. |

## Capture Accuracy

ViewGraph's capture accuracy is measured automatically against 150 diverse real-world websites using a [bulk capture experiment](./scripts/experiments/bulk-capture/). The experiment runs ViewGraph's DOM traverser via Puppeteer, then compares the output against live DOM ground truth across 7 dimensions.

**Latest results** (Set A - Breadth, 48 sites across 12 categories, 4 rendering types, 6 writing systems):

| Dimension | Median | What it measures |
|---|---|---|
| **Composite** | **92.1%** | Weighted combination of all dimensions |
| Selector accuracy | 99.7% | VG's CSS selectors resolve to real DOM elements |
| Testid recall | 100.0% | All `data-testid` elements captured |
| Interactive recall | 97.9% | Buttons, links, inputs captured |
| Bbox accuracy | 100.0% | Bounding boxes preserved through serialization |
| Semantic recall | 88.2% | Landmark elements (nav, main, header) captured |
| Text match | 53.1% | `visibleText` matches element text (see note) |

Text match is lower by design - VG truncates text to 200 characters to keep captures within LLM context windows, and `innerText` on parent elements includes all descendant text.

Sites that block headless browsers (bot detection) or reject script injection (strict CSP) are excluded from accuracy calculations. In our test pool, ~20% of sites fall into this category - these are flagged in the [per-run reports](./scripts/experiments/bulk-capture/results/).

Three experiment sets test different hypotheses:

| Set | Focus | Sites | Composite |
|---|---|---|---|
| [A - Breadth](./scripts/experiments/bulk-capture/) | Max diversity across all axes | 48 | 92.1% |
| [B - Depth](./scripts/experiments/bulk-capture/) | Hardest patterns (SPAs, RTL, shadow DOM) | 50 | 79.0%* |
| [C - Real-world](./scripts/experiments/bulk-capture/) | Traffic-weighted, typical usage | 50 | 79.2%* |

*Sets B and C were run before measurement fixes and include bot-blocked sites in the denominator. Re-running with current methodology would produce higher scores.

Full methodology, per-site breakdowns, and run history: [`scripts/experiments/bulk-capture/`](./scripts/experiments/bulk-capture/)

### Methodology

Accuracy is measured by injecting ViewGraph's capture modules (traverser, salience scorer, serializer) into real websites via Puppeteer and comparing the output against live DOM ground truth collected in the same browser session. For each site, a ground-truth collector walks the DOM and counts all visible elements, interactive elements, `data-testid` elements, semantic landmarks, and text content. The VG capture runs immediately after, and a measurement function matches every VG element back to the live DOM by selector to verify correctness. Bounding boxes are validated by comparing the serialized output against the traverser's original values to confirm the serialization pipeline preserves spatial data. Each run is recorded in a [timestamped index](./scripts/experiments/bulk-capture/results/) so accuracy can be tracked across code changes. Sites are tagged across 5 diversity axes (category, complexity, rendering type, writing system, accessibility maturity) so results can be sliced by any dimension.

No competitor in this space publishes equivalent accuracy metrics against real-world websites. Browser automation MCP servers (Playwright MCP, Browser Use) operate on accessibility trees or screenshots rather than structured DOM, so there is no directly comparable recall/precision measurement. ViewGraph is the only tool that produces structured, agent-consumable DOM captures and measures their fidelity against ground truth.

## How ViewGraph Compares

ViewGraph occupies a unique position: the UI context layer for AI coding agents. It bridges what humans see in the browser and what agents need to fix code. Here is how it compares to adjacent tools:

| Capability | ViewGraph | Playwright MCP | Chromatic | Replay.io | axe MCP |
|---|---|---|---|---|---|
| Structured DOM capture | Full snapshot with styles, bbox, selectors | Accessibility tree only | Component screenshots | Runtime recording | Violations only |
| Human annotations | Click/drag + comments + severity | No | Component review | No | No |
| MCP tools for agents | 34 tools | Browser automation | Component metadata | Runtime debugging | A11y scanning |
| Accessibility audit | WCAG + contrast + axe-core | Needs axe-playwright | WCAG violations | No | Industry standard |
| Layout analysis | Overflow, overlap, viewport | No | No | No | No |
| Source file linking | testid/label/selector grep + React fiber | No | No | Source maps | No |
| Structural regression | Baseline comparison | No | Visual diff | No | No |
| Works with any web app | Any URL, any backend | Any URL | Storybook required | Any URL | Any URL |
| No code required | Browser extension | Test scripts needed | Stories needed | Recording setup | Extension + MCP |
| Standalone (no AI) | Copy MD / ZIP export | No | Visual review | Debugging UI | Extension |

ViewGraph is the only tool that combines human annotations + structured DOM + MCP in a single workflow that works on any web app with zero project setup. Browser automation tools (Playwright MCP, Browser Use) control headless browsers - they are the "hands" while ViewGraph is the "eyes." Visual regression tools (Chromatic, Percy) compare pixels but require Storybook or CI integration. Runtime debuggers (Replay.io) capture execution traces but have no review workflow.

For the full competitive analysis covering 16 tools across 5 categories, see [Competitive Analysis](./docs/architecture/competitive-analysis-browser-mcp.md) and [Product Analysis](./docs/architecture/product-analysis.md).

## Development

All commands run from the ViewGraph root directory:

```bash
npm run dev:server     # start MCP server with file watcher
npm run dev:ext        # start extension dev server (Chrome HMR)
npm run dev:ext:ff     # start extension dev server (Firefox HMR)
npm test               # all tests (984 tests)
npm run test:server    # server only (331 tests)
npm run test:ext       # extension only (653 tests)
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
packages/
  playwright/    Playwright fixture (@viewgraph/playwright)
power/           Kiro Power assets (steering docs, hooks, prompts)
docs/            Documentation, architecture, decisions, changelogs
scripts/         Git scripts, build scripts, init, status, doctor
.kiro/           Specs, steering docs, hooks
```

## Documentation

- [User Guide](https://chaoslabz.gitbook.io/viewgraph) - getting started, tutorials, feature guides
- [Quick Start](https://chaoslabz.gitbook.io/viewgraph/getting-started/quick-start) - zero to first fix in 5 minutes
- [Multi-Project Setup](https://chaoslabz.gitbook.io/viewgraph/getting-started/multi-project) - URL patterns, routing
- [@viewgraph/playwright](https://www.npmjs.com/package/@viewgraph/playwright) - Playwright fixture on npm
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
