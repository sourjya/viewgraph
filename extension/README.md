# ViewGraph Browser Extension

Firefox/Chrome extension for capturing structured DOM snapshots, screenshots, and annotations from any web page.

Built with [WXT](https://wxt.dev/) for cross-browser Manifest V3 support.

## Status

Core capture pipeline complete - DOM traversal, salience scoring, serialization, popup UI, background orchestration, and HTTP push to MCP server.

**Spec:** [`.kiro/specs/extension-core/`](../.kiro/specs/extension-core/) - DOM traversal, serialization, popup UI, background orchestration.

See [Extension UX and Intelligence](../docs/ideas/extension-ux-and-intelligence.md) for planned UI patterns (floating toolbar, comment box, highlight overlay) and intelligence features.

## Testing

```bash
npm test               # unit tests (38 tests, 3 files)
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
├── background.js        Service worker
└── popup/               Mode switcher UI
lib/                     Core modules (DOM traversal, serializer, etc.)
ui/                      Overlay, panels, sidebar
options/                 Settings page
public/                  Static assets
tests/                   Extension tests
```
