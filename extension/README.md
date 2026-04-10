# ViewGraph Browser Extension

Chrome/Firefox extension for capturing structured DOM snapshots, annotating UI issues,
and sending feedback to AI coding assistants.

Built with [WXT](https://wxt.dev/) for cross-browser Manifest V3 support.

## Features

- **DOM Capture** - full page DOM traversal with salience scoring, spatial clustering, style extraction
- **Unified Annotate** - click elements or shift+drag regions to annotate with comments and severity
- **Page Notes** - page-level comments labeled P1, P2, etc. with separate numbering from element annotations
- **Multi-Export** - Send to Kiro (MCP push), Copy Markdown (clipboard), Download Report (ZIP with screenshots)
- **Auto-Detect Project** - fetches `/info` from MCP server to auto-detect project root and captures directory
- **Server Discovery** - auto-discovers MCP server on ports 9876-9879, matches by project
- **Sidebar UX** - mode hints on buttons, two-line entry layout, themed scrollbar, settings with read-only project info
- **Connection Status** - green dot indicator in popup and sidebar when MCP server is connected

## Specs

- [Extension Core](../.kiro/specs/extension-core/) - DOM traversal, serialization, popup UI
- [Unified Annotate Mode](../.kiro/specs/unified-annotate-mode/) - merged inspect + review
- [Multi-Export](../.kiro/specs/multi-export/) - markdown, ZIP, MCP push
- [Unified Review Panel](../.kiro/specs/unified-review-panel/) - upcoming sidebar redesign

## Testing

```bash
npm test               # unit tests (309 tests)
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
  popup/                 Extension popup - Capture/Annotate buttons, connection status
  options/               Settings page - auto-detected project info, manual override toggle
lib/
  annotate.js            Unified annotation state machine (click + drag + page notes)
  annotation-panel.js    Floating comment panel with severity selector
  annotation-sidebar.js  Sidebar with timeline, export buttons, settings, auto-detect
  constants.js           Shared constants, server discovery (port scanning)
  dom-walker.js          DOM traversal and ViewGraph JSON serialization
  export-markdown.js     Markdown bug report formatter
  export-zip.js          ZIP assembly (markdown + cropped screenshots)
  screenshot-crop.js     Viewport screenshot cropping per annotation
public/                  Static assets (icons)
tests/                   Extension tests (309 tests)
```
