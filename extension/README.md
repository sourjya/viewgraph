# ViewGraph Browser Extension

Chrome/Firefox extension for capturing structured DOM snapshots, annotating UI issues,
and sending feedback to AI coding assistants.

Built with [WXT](https://wxt.dev/) for cross-browser Manifest V3 support.

## Features

- **Direct-Toggle Annotate** - click the toolbar icon to enter annotate mode instantly (no popup)
- **DOM Capture** - full page DOM traversal with salience scoring, spatial clustering, style extraction
- **Unified Annotate** - click elements or shift+drag regions to annotate with comments and severity
- **Two-Tab Sidebar** - Review tab for annotations/export, Inspect tab for page diagnostics
- **Inspect Tab** - live viewport breakpoint, network requests (failed highlighted), console errors/warnings, visibility warnings
- **Page Notes** - page-level comments labeled P1, P2, etc. with separate numbering
- **Multi-Export** - Send to Agent (MCP push with full capture), Copy Markdown (with environment data), Download Report (ZIP with screenshots + network.json + console.json)
- **Agent Request Cards** - when the agent calls `request_capture`, a card appears in the sidebar with purpose icon (capture/inspect/verify), Accept and Decline buttons
- **Collapsed Strip** - sidebar collapses to a slim strip with 32px mode icons and chat bubble annotation count
- **Confirmation Dialog** - themed card dialog for destructive actions (Clear All) instead of native browser confirm
- **Enrichment Data** - network state, console errors, breakpoints, isRendered flags captured and included in exports
- **Auto-Detect Project** - fetches `/info` from MCP server to auto-detect project root and captures directory
- **Zero-Config Auth** - reads auth token from server `/info` endpoint, includes Bearer header on all POSTs automatically
- **Server Discovery** - auto-discovers MCP server on ports 9876-9879, matches by project
- **Connection Status** - green dot indicator in sidebar header when MCP server is connected

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

## Specs

- [Extension Core](../.kiro/specs/extension-core/) - DOM traversal, serialization, popup UI
- [Unified Annotate Mode](../.kiro/specs/unified-annotate-mode/) - merged inspect + review
- [Multi-Export](../.kiro/specs/multi-export/) - markdown, ZIP, MCP push

## Testing

```bash
npm test               # unit tests (365 tests)
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
  content.js             Content script - DOM traversal, annotation injection
  popup/                 Fallback popup for non-injectable pages
  options/               Settings page - project mapping, manual overrides
lib/
  annotate.js            Annotation state machine (click + drag + page notes + a11y helpers)
  annotation-panel.js    Floating comment panel with severity/category selectors
  annotation-sidebar.js  Two-tab sidebar (Review + Inspect), export buttons, settings overlay
  breakpoint-collector.js  Viewport breakpoint detection (xs through 2xl)
  console-collector.js   Console error/warning interceptor
  network-collector.js   Performance API network request collector
  visibility-collector.js  isRendered ancestor walk (opacity, clip-path, off-screen)
  constants.js           Shared constants, server discovery (port scanning)
  export-markdown.js     Markdown bug report formatter (with environment section)
  export-zip.js          ZIP assembly (markdown + screenshots + network.json + console.json)
  screenshot-crop.js     Viewport screenshot cropping per annotation (scroll-aware, bounds-clamped)
  traverser.js           DOM traversal and node extraction
  serializer.js          ViewGraph v2.1 JSON serialization
  salience.js            Element salience scoring (interactivity, testid, aria, viewport)
  html-snapshot.js       HTML snapshot serializer for fidelity measurement
  url-checks.js          Injectable page detection (chrome://, about:, etc.)
public/                  Static assets (icons)
tests/                   Extension tests (365 tests)
```
