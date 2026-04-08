# Multi-Export Annotations - Design

## Architecture

```
Sidebar export buttons
  |
  +-- "Send to Kiro"     --> chrome.runtime.sendMessage({ type: 'send-review' })
  |                           --> background.js --> POST to MCP server (existing)
  |
  +-- "Copy Markdown"    --> formatMarkdown(annotations) --> navigator.clipboard
  |
  +-- "Download Report"  --> chrome.runtime.sendMessage({ type: 'download-report' })
                              --> background.js:
                                  1. captureVisibleTab() --> full viewport PNG
                                  2. Send PNG + annotations to content script
                                  3. Content script crops per-annotation regions on canvas
                                  4. Returns cropped data URLs
                                  5. Background assembles ZIP (using JSZip or manual)
                                  6. Triggers download via chrome.downloads API
```

## Markdown Formatter

Lives in `extension/lib/export-markdown.js`. Pure function, no DOM dependency.

```js
export function formatMarkdown(annotations, metadata) {
  // metadata: { title, url, timestamp }
  // Returns markdown string
}
```

## Screenshot Cropping

Lives in `extension/lib/screenshot-crop.js`. Uses OffscreenCanvas (or regular canvas in content script).

```js
export function cropRegions(viewportDataUrl, annotations) {
  // Returns Map<annotationId, croppedDataUrl>
}
```

Flow:
1. Background calls `chrome.tabs.captureVisibleTab()` - returns full viewport as data URL
2. Sends to content script (or uses offscreen document in MV3)
3. Draws onto canvas, crops each annotation's region
4. Returns array of `{ id, dataUrl }` pairs

## ZIP Assembly

Background script assembles the ZIP. Options:
- **JSZip** - well-tested library, ~100KB. Adds a dependency.
- **Manual ZIP** - possible but fragile for binary PNG data.

Recommendation: use JSZip. It's a build-time dependency only (bundled by WXT), doesn't affect the MCP server.

ZIP structure:
```
viewgraph-review-localhost-20260409.zip
  report.md
  screenshots/
    ann-2.png
    ann-3.png
    ann-4.png
```

## Sidebar Layout Change

Current:
```
[        Send to Kiro        ]
```

New:
```
[ Send to Kiro ] [ Copy MD ] [ Download ]
```

Three equal-width icon buttons with tooltips. Same disabled-when-empty behavior.

## Settings Integration

Add `includeScreenshots` to the existing `vg-settings` storage key:
```js
{ html: false, screenshot: false, includeScreenshots: false }
```

When `includeScreenshots` is false, "Download Report" generates markdown-only ZIP (no screenshots/ folder).
