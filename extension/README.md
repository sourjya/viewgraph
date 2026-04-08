# ViewGraph Browser Extension

Firefox/Chrome extension for capturing structured DOM snapshots, screenshots, and annotations from any web page.

Built with [WXT](https://wxt.dev/) for cross-browser Manifest V3 support.

## Status

Scaffolded - core capture functionality is planned for [Milestone 4](../docs/roadmap/roadmap.md).

See [Extension UX and Intelligence](../docs/ideas/extension-ux-and-intelligence.md) for planned UI patterns (floating toolbar, comment box, highlight overlay) and intelligence features.

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
