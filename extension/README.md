# ViewGraph Browser Extension

Chrome/Firefox extension for capturing structured DOM snapshots, annotating UI issues,
and sending feedback to AI coding assistants.

Built with [WXT](https://wxt.dev/) for cross-browser Manifest V3 support.

**[Documentation](https://chaoslabz.gitbook.io/viewgraph)** - **[Quick Start](https://chaoslabz.gitbook.io/viewgraph/getting-started/quick-start)** - **[GitHub](https://github.com/sourjya/viewgraph)**

## End-User Features

These are the features you interact with directly:

- **Direct-Toggle Annotate** - click the toolbar icon to enter annotate mode instantly
- **Click to Annotate** - click any element to select it and add a comment with severity/category
- **Region Select** - shift+drag to select an area and annotate it
- **DOM Navigation** - scroll wheel while hovering to move up/down the DOM tree
- **Page Notes** - page-level comments labeled P1, P2, etc. (separate from element numbering)
- **Two-Tab Sidebar** - Review tab (annotations, export) + Inspect tab (network, console, breakpoints)
- **Multi-Export** - Send to Agent (MCP), Copy Markdown (clipboard), Download Report (ZIP)
- **Agent Request Cards** - when your agent requests a capture, a card appears with Accept/Decline
- **Keyboard Shortcuts** - Esc (deselect), Ctrl+Enter (send), 1/2/3 (severity), Delete (remove)
- **Element Flash** - green highlight pulse when selecting elements

## Under-the-Hood Features

These run automatically during capture:

- **17 Enrichment Collectors** - network, console, breakpoints, stacking contexts, focus chain, scroll containers, landmarks, components, axe-core, event listeners, performance, animations, intersection state, visibility, CSS custom properties, storage, transient UI state
- **Auto-Capture on HMR** - detects Vite/webpack hot-reload and auto-captures after DOM settles
- **Journey Recording** - auto-captures on SPA navigation, groups into named sessions
- **WebSocket Collaboration** - real-time annotation sync with MCP server
- **Zero-Config Connection** - discovers local server automatically, no configuration needed
- **Server Discovery** - auto-discovers MCP server on ports 9876-9879
- **Capture Validation** - quality checks before export (empty pages, missing data)
- **Service Worker Architecture (M19)** - all HTTP communication (capture push, snapshot push, request polling) runs in the service worker, not the content script. Eliminates cross-origin issues and works on pages with strict CSP.
- **Alarm-Based Background Sync** - Chrome alarms API polls for pending agent requests and syncs resolved annotation history on a periodic schedule, even when no tab is active
- **Resolved History Sync** - resolved annotations are fetched from the server and displayed in the sidebar so reviewers see real-time fix status

## UI Surfaces

| Surface | Purpose |
|---|---|
| Toolbar icon | Single-click toggles annotate mode. Popup fallback on non-injectable pages. |
| Overlay | Hover highlight with 2-line tooltip (breadcrumb + meta). Click to freeze. Scroll wheel for DOM navigation. |
| Sidebar - Review tab | Annotation list, filter tabs (All/Open/Resolved), export buttons |
| Sidebar - Inspect tab | Viewport breakpoint, network requests, console errors, visibility warnings |
| Sidebar - Collapsed strip | 32px mode icons (element/region/page), expand chevron, annotation count |
| Annotation panel | Floating editor near selected element: severity, category chips, comment textarea |
| Settings overlay | Server status, project mapping |
| Options page | Advanced multi-project URL-to-directory mapping |

See [UX Design](../docs/product/ux-analysis.md) for design decisions and user journeys.

## Enrichment Collectors (14)

Each collector is wrapped in `safeCollect()` - if one fails, the rest still run and the capture succeeds.

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
| `css-custom-properties-collector` | CSS custom properties (variables) defined on the page |
| `storage-collector` | localStorage, sessionStorage, and cookie entries |
| `transient-collector` | Transient DOM mutations (toasts, flash content, render thrashing) |

## Development

All commands run from the **ViewGraph root directory** (not `extension/`):

### Dev server (recommended for development)

```bash
npm run dev:ext          # Chrome with hot-reload (HMR)
npm run dev:ext:firefox  # Firefox with hot-reload
```

### Building for production

```bash
npm run build:ext                          # Chrome
npm run build:ext -- --browser firefox     # Firefox
```

Output goes to `extension/.output/chrome-mv3/` (or `firefox-mv3/`).

### Testing

```bash
npm run test:ext                 # 599 tests, single run
npm run test:ext -- --watch      # watch mode
```

Or from the `extension/` directory:

```bash
npm test                         # same 599 tests
```

## Specs

- [Extension Core](../.kiro/specs/extension-core/) - DOM traversal, serialization, popup UI
- [Unified Annotate Mode](../.kiro/specs/unified-annotate-mode/) - merged inspect + review
- [Multi-Export](../.kiro/specs/multi-export/) - markdown, ZIP, MCP push
- [Inspect Tab Redesign](../.kiro/specs/inspect-tab-redesign/) - captures UX simplification

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
  enrichment.js          Orchestrator for all 17 collectors (safeCollect wrapper)
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
  (17 *-collector.js)    Enrichment collectors (see table above)
public/                  Static assets (icons)
tests/                   Extension tests (599 tests)
```
