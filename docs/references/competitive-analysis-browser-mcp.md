# Competitive Analysis: Browser Automation MCP Servers

**Date:** 2026-04-08

**Packages analyzed:**
- [@agent-infra/mcp-server-browser](https://www.npmjs.com/package/@agent-infra/mcp-server-browser) (ByteDance/UI-TARS)
- [MCP-Server-Playwright](https://github.com/VikashLoomba/MCP-Server-Playwright) (Automata Labs)

---

## How they differ from ViewGraph

Both are browser automation MCP servers - they control a headless browser
(Puppeteer/Playwright) to navigate, click, fill forms, and take screenshots.

| | Browser MCP / Playwright MCP | ViewGraph |
|---|---|---|
| Model | Headless browser controlled by agent | Real browser used by human, captured for agent |
| Purpose | Agent acts on pages | Agent understands pages |
| Input | Agent sends commands | Human captures state |
| Output | Action results, screenshots | Structured page context |
| Dependency | Puppeteer/Playwright runtime | Browser extension (lightweight) |

They are complementary, not competitive. An agent could use ViewGraph to
understand a page, then use Playwright MCP to act on it.

---

## Features worth incorporating

### 1. Element index for action interop

@agent-infra uses a "label index" system - each interactive element gets a
numeric index. The agent says "click element 7" instead of passing a selector.
This is cleaner for action workflows and bridges ViewGraph captures to
browser automation tools.

**Status: Shipped.** ViewGraph's `nid` (node ID) system serves this purpose.
Each element gets a stable numeric ID in the capture. The `get_interactive_elements`
tool returns elements with nids that agents can reference.

### 2. Element-level screenshot

Both tools support screenshotting a specific element by selector. We could
add this to our extension - when the agent identifies an element via MCP,
it could request a cropped screenshot of just that element's bounding box.

**Status: Shipped.** The `compare_screenshots` tool does pixel-level comparison.
The extension crops screenshots per annotation region via `screenshot-crop.js`.

### 3. Console log capture

Both expose `console://logs` as an MCP resource. Runtime errors and
warnings alongside UI state would help agents debug issues.

**Status: Shipped.** The `console` enrichment collector captures `console.error`
and `console.warn` messages. Included in every capture automatically.

### 4. Vision model coordinate factors

@agent-infra's `x-vision-factors` header handles coordinate normalization
between vision model output space and actual screen pixels. If we ever
support vision model integration, we need the same mapping.

**Status: Shipped.** The `coordinateFrame` metadata section includes unit,
origin, scroll offset, and precision fields. Device pixel ratio is also
recorded for retina display mapping.

---

## What NOT to incorporate

- **Browser automation tools** (navigate, click, fill, scroll) - that's
  their domain. ViewGraph is about understanding, not controlling.
- **Headless browser dependency** - they require Puppeteer/Playwright.
  We use the user's real browser via extension. Much lighter.
- **Vision model as primary mode** - their vision mode is a fallback for
  when structured data fails. Our structured data IS the product.

---

## Interop opportunity

The strongest play is making ViewGraph captures consumable by browser
automation tools. If an agent has both ViewGraph and Playwright MCP
servers connected:

1. ViewGraph: understand the page (structure, a11y, selectors, layout)
2. Playwright: act on the page (click, fill, navigate)

The element index and locator data from ViewGraph feeds directly into
Playwright's action commands. This makes ViewGraph the "eyes" and
Playwright the "hands."

**Status: Shipped.** The `@viewgraph/playwright` package provides a
Playwright test fixture that captures ViewGraph DOM snapshots during
E2E test runs. Usage: `await viewgraph.capture('after-login')`. Captures
land in `.viewgraph/captures/` where the MCP server picks them up.
The `@vg-tests` prompt template guides agents to generate Playwright
tests from existing captures, completing the bidirectional bridge.

---

## BrowserTools MCP (AgentDeskAI) - Deep Architecture Analysis

**Date:** 2026-04-27
**Repo:** [github.com/AgentDeskAI/browser-tools-mcp](https://github.com/AgentDeskAI/browser-tools-mcp) (7.2k stars, abandoned March 2025)
**Category:** Browser capture tool (same category as ViewGraph, unlike the automation tools above)

BrowserTools MCP is the closest direct competitor to ViewGraph. Both capture browser state and expose it to AI agents via MCP. This section documents the architectural differences and why ViewGraph chose a different approach.

### Architecture: Three-Tier vs Two-Tier

BrowserTools uses three separate processes:

```
IDE Agent <-> MCP Server (stdio) <-> Node Middleware (HTTP) <-> Chrome Extension (WebSocket + HTTP)
               process 1               process 2                  browser process
               port: stdio             port: 3025                 port: 3025/ws
```

ViewGraph uses two:

```
IDE Agent <-> MCP Server (stdio + HTTP + WS) <-> Chrome Extension (HTTP + WS)
               process 1                          browser process
               port: stdio + 9876                 (no server)
```

The BrowserTools middleware (`browser-tools-server`) is a separate Express app that the user must start manually in a terminal (`npx @agentdeskai/browser-tools-server`). The MCP server (`browser-tools-mcp`) is a second process started by the IDE. The extension connects to the middleware via WebSocket and HTTP POST.

ViewGraph's MCP server handles all three roles (MCP stdio, HTTP receiver, WebSocket) in a single process that auto-starts via `npx` - no manual terminal step.

### Communication Protocol Comparison

| Layer | BrowserTools | ViewGraph |
|---|---|---|
| Extension -> Server (data push) | HTTP POST `/extension-log` (all log types multiplexed on one endpoint) | HTTP POST `/captures` (structured JSON capture) |
| Extension -> Server (real-time) | WebSocket `/extension-ws` (screenshots, navigation events) | WebSocket on same port (annotation resolution, audit results, live status) |
| Server -> Extension (commands) | WebSocket `take-screenshot` message | WebSocket + HTTP `/requests/pending` (capture requests with purpose/guidance) |
| MCP Server -> Data | HTTP GET to middleware (`/console-logs`, `/network-errors`, etc.) | Direct file reads from `.viewgraph/captures/` |
| Data persistence | In-memory arrays (lost on restart) | JSON files on disk (permanent) |
| Auth | None | HMAC-signed localhost (optional), native messaging (planned) |

### Data Flow: Push-Everything vs Capture-on-Demand

BrowserTools pushes ALL browser data continuously to the middleware:
- Every console.log, console.error
- Every XHR request/response
- Every network error
- The currently selected DOM element

The middleware stores these in memory arrays with configurable size limits. When the MCP server needs data, it pulls from these arrays via HTTP GET.

**Problem:** The extension pushes data whether the agent needs it or not. The middleware truncates strings and limits array sizes to avoid token overflow, but the fundamental approach is wasteful - most captured data is never consumed.

ViewGraph captures on demand - the user clicks the icon or the agent requests a capture. Each capture is a complete, structured snapshot with all enrichment data (17 collectors). Nothing is pushed until the user or agent asks for it.

### What BrowserTools Does Well

1. **WebSocket for screenshots** - the request/response pattern (server sends `take-screenshot`, extension responds with base64 data) is clean. ViewGraph uses `chrome.tabs.captureVisibleTab` in the background script instead, which is simpler but requires the background script to be alive.

2. **Lighthouse integration** - Puppeteer-based audits for a11y, performance, SEO, best practices. ViewGraph uses axe-core in the extension (no Puppeteer dependency) for a11y, plus custom layout/contrast/testid audits.

3. **Simple mental model** - three components, each does one thing. Easy to explain even if operationally clunky.

### Why ViewGraph Chose a Different Architecture

**1. No middleware layer.**
The three-process architecture creates operational friction (user must start two servers) and a reliability gap (middleware crash loses all data). ViewGraph's single server process eliminates both. The server auto-starts via MCP stdio and persists data to disk.

**2. File-based persistence over in-memory buffers.**
BrowserTools loses all data on middleware restart. ViewGraph captures are JSON files that survive any process lifecycle. Multiple agents can read the same captures. Captures can be diffed, baselined, archived, and version-controlled.

**3. Structured captures over raw log streams.**
BrowserTools stores raw console logs and XHR entries as flat arrays. ViewGraph produces structured DOM snapshots with computed styles, bounding boxes, accessibility attributes, component trees, and 17 enrichment dimensions. The agent gets a complete page model, not a log dump.

**4. Bidirectional annotation workflow.**
BrowserTools is read-only - capture data, show it to the agent. ViewGraph supports a full loop: human annotates -> agent fixes -> resolution syncs back -> human verifies. The Resolved tab, live status updates, and `resolve_annotation` tool have no equivalent in BrowserTools.

**5. Security by design.**
BrowserTools has no auth, no input validation, no prompt injection defense. Any process on localhost can read all captured data. ViewGraph has HMAC-signed requests, URL trust classification, 4-layer prompt injection defense, and a published STRIDE threat model.

**6. No Puppeteer dependency.**
BrowserTools requires Puppeteer for Lighthouse audits, adding ~400MB of Chromium download. ViewGraph runs axe-core directly in the extension content script - zero external dependencies for auditing.

### Feature Comparison Matrix

| Feature | BrowserTools | ViewGraph |
|---|---|---|
| Console log capture | Yes (continuous push) | Yes (per-capture snapshot) |
| Network request capture | Yes (continuous push) | Yes (per-capture snapshot) |
| DOM element capture | Selected element only | Full structured DOM tree |
| Screenshots | Yes (WS request/response) | Yes (captureVisibleTab + crop) |
| Accessibility audit | Lighthouse via Puppeteer | axe-core in extension + custom rules |
| Performance audit | Lighthouse via Puppeteer | Navigation/resource timing collector |
| Annotation/review | No | Full workflow with resolution tracking |
| Capture diffing | No | Structural diff, style diff, screenshot diff |
| Baseline regression | No | Set/compare golden baselines |
| Test generation | No | @vg-tests prompt from captures |
| Multi-project routing | No | URL pattern matching across 4 ports |
| Prompt injection defense | No | 4-layer defense with delimiters |
| Auth | None | HMAC + native messaging |
| Data persistence | In-memory (lost on restart) | Files on disk (permanent) |
| Processes to run | 3 (extension + middleware + MCP) | 1 (server auto-starts) |
| Tests | 0 | 1700+ |
| Status | Abandoned (March 2025) | Active |

### Conclusion

BrowserTools MCP validated the market for browser-to-agent capture tools and achieved significant adoption (7.2k stars). However, its three-process architecture, lack of persistence, read-only workflow, and absence of security measures made it unsuitable as a foundation for serious development workflows. The project's abandonment confirms these architectural limitations.

ViewGraph's design choices - single-process server, file persistence, structured captures, bidirectional annotation workflow, and security-first approach - address every weakness in the BrowserTools architecture while adding capabilities (diffing, baselines, test generation, multi-project routing) that BrowserTools never attempted.
