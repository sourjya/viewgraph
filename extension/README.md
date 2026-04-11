# ViewGraph Browser Extension

Chrome/Firefox extension for capturing structured DOM snapshots, annotating UI issues,
and sending feedback to AI coding assistants.

Built with [WXT](https://wxt.dev/) for cross-browser Manifest V3 support.

## Features

- **Direct-Toggle Annotate** - click the toolbar icon to enter annotate mode instantly (no popup)
- **DOM Capture** - full page DOM traversal with salience scoring, spatial clustering, style extraction
- **Unified Annotate** - click elements or shift+drag regions to annotate with comments and severity
- **Two-Tab Sidebar** - Review tab for annotations/export, Inspect tab for page diagnostics
- **Inspect Tab** - live viewport breakpoint, network requests (failed highlighted), console errors/warnings, capture history with auto-diff, visibility warnings
- **Page Notes** - page-level comments labeled P1, P2, etc. with separate numbering
- **Multi-Export** - Send to Agent (MCP push with full capture), Copy Markdown (with environment data), Download Report (ZIP with screenshots + network.json + console.json)
- **Agent Request Cards** - when the agent calls `request_capture`, a card appears in the sidebar with purpose icon (capture/inspect/verify), Accept and Decline buttons
- **Collapsed Strip** - sidebar collapses to a slim strip with 32px mode icons and chat bubble annotation count
- **Confirmation Dialog** - themed card dialog for destructive actions (Clear All) instead of native browser confirm
- **14 Enrichment Collectors** - network, console, breakpoints, stacking contexts, focus chain, scroll containers, landmarks, components, axe-core, event listeners, performance, animations, intersection state, visibility
- **Auto-Capture on HMR** - detects Vite/webpack hot-reload events and auto-captures after DOM settles
- **Journey Recording** - auto-captures on SPA navigation (pushState/popstate), groups into named sessions
- **Continuous Capture** - periodic DOM snapshots for regression tracking
- **Subtree Capture** - focused capture of a specific DOM subtree with full computed styles
- **Keyboard Shortcuts** - power user shortcuts for annotate mode (Esc, Enter, Tab, arrow keys)
- **WebSocket Collaboration** - real-time annotation sync with MCP server
- **Element Flash** - visual feedback (green flash) when selecting elements
- **Auto-Detect Project** - fetches `/info` from MCP server to auto-detect project root and captures directory
- **Zero-Config Auth** - reads auth token from server, includes Bearer header on all POSTs automatically
- **Server Discovery** - auto-discovers MCP server on ports 9876-9879, matches by project
- **Connection Status** - green dot indicator in sidebar header when MCP server is connected
- **Capture Validation** - quality checks on captures before export (empty pages, missing data)

## UI Surfaces

| Surface | Purpose |
|---|---|
| Toolbar icon | Single-click toggles annotate mode. Popup fallback on non-injectable pages. |
| Overlay | Hover highlight with 2-line tooltip (breadcrumb + meta). Click to freeze. Scroll wheel for DOM navigation. |
| Sidebar - Review tab | Annotation list, filter tabs, mode bar, agent request cards, Send/Copy/Report export buttons |
| Sidebar - Inspect tab | Viewport breakpoint, network requests, console errors, visibility warnings |
| Sidebar - Collapsed strip | 32px mode icons (element/region/page), expand chevron, chat bubble count |
| Annotation panel | Floating editor near selected element: severity, category chips, comment textarea |
| Confirmation dialog | Themed card overlay for Clear All (dark card, red border, Cancel/Clear All) |
| Settings overlay | Server status, project mapping, capture format toggles |
| Options page | Advanced multi-project URL-to-directory mapping |

See [UX Design](../docs/architecture/ux-analysis.md) for design decisions and user journeys.

## Enrichment Collectors (14)

Each collector is wrapped in `safeCollect()` - one failure never crashes the capture.

| Collector | What it captures |
|---|---|
| `network-collector` | Performance API network requests (failed highlighted) |
| `console-collector` | Console errors, warnings, and logs via interceptor |
| `breakpoint-collector` | Viewport breakpoint (xs-2xl) and @media rule extraction |
| `stacking-collector` | Z-index stacking contexts and sibling overlap conflicts |
| `focus-collector` | Focus chain, tab order, focus traps, unreachable elements |
| `scroll-collector` | Scroll containers with overflow dimensions |
| `landmark-collector` | ARIA landmarks, missing `<main>`, duplicate unlabeled navs |
| `component-collector` | React/Vue/Svelte component tree detection |
| `axe-collector` | axe-core WCAG audit (100+ rules) |
| `event-listener-collector` | Click/input/change handlers on DOM elements |
| `performance-collector` | Navigation timing, resource timing, LCP, CLS, FID |
| `animation-collector` | CSS animations/transitions (running, paused, pending) |
| `intersection-collector` | Viewport visibility state via IntersectionObserver |
| `visibility-collector` | isRendered ancestor walk (opacity, clip-path, off-screen) |

## Specs

- [Extension Core](../.kiro/specs/extension-core/) - DOM traversal, serialization, popup UI
- [Unified Annotate Mode](../.kiro/specs/unified-annotate-mode/) - merged inspect + review
- [Multi-Export](../.kiro/specs/multi-export/) - markdown, ZIP, MCP push
- [Inspect Tab Redesign](../.kiro/specs/inspect-tab-redesign/) - captures UX simplification

## Testing

```bash
npm test               # unit tests (599 tests)
npm run test:watch     # watch mode
```

## Development

```bash
npm run dev              # Chrome (default, recommended for dev)
npm run dev:firefox      # Firefox
```

## Building

```bash
npm run build            # Chrome
npm run build:firefox    # Firefox
npm run zip:firefox      # package for distribution
```

## Structure

```
entrypoints/
  background.js          Service worker - capture orchestration, HTTP push, request polling
  content.js             Content script - DOM traversal, annotation injection, export
  popup/                 Fallback popup for non-injectable pages
  options/               Settings page - project mapping, manual overrides
lib/
  annotate.js            Annotation state machine (click + drag + page notes)
  annotation-panel.js    Floating comment panel with severity/category selectors
  annotation-sidebar.js  Two-tab sidebar (Review + Inspect), export buttons, settings overlay
  traverser.js           DOM traversal and node extraction
  serializer.js          ViewGraph v2.1 JSON serialization
  salience.js            Element salience scoring (interactivity, testid, aria, viewport)
  selector.js            Shared CSS selector builder + ATTR constant
  html-snapshot.js       HTML snapshot serializer for fidelity measurement
  enrichment.js          Orchestrator for all 14 collectors (safeCollect wrapper)
  safe-collect.js        Error boundary wrapper for collectors
  export-markdown.js     Markdown bug report formatter (with environment section)
  export-zip.js          ZIP assembly (markdown + screenshots + network.json + console.json)
  screenshot-crop.js     Viewport screenshot cropping per annotation (scroll-aware, bounds-clamped)
  auto-capture.js        HMR-triggered auto-capture (Vite/webpack detection)
  continuous-capture.js  Periodic DOM snapshot capture
  journey-recorder.js    SPA navigation auto-capture with session grouping
  session-manager.js     Capture session state (start/stop/add step/metadata)
  subtree-capture.js     Focused DOM subtree capture with computed styles
  keyboard-shortcuts.js  Power user keyboard shortcuts for annotate mode
  ws-client.js           WebSocket client for real-time annotation sync
  capture-validator.js   Quality checks on captures before export
  element-flash.js       Green flash visual feedback on element selection
  element-diagnostics.js Element-level diagnostic hints
  network-grouper.js     Network request grouping by domain/type
  constants.js           Shared constants, server discovery (port scanning)
  storage.js             Chrome storage abstraction (local)
  url-checks.js          Injectable page detection (chrome://, about:, etc.)
  hmr-detector.js        Vite/webpack HMR event detection
  (14 *-collector.js)    Enrichment collectors (see table above)
public/                  Static assets (icons)
tests/                   Extension tests (599 tests)
```
