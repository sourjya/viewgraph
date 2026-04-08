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

Icons (Lucide-style, 14px, stroke currentColor, stroke-width 2):
- **Send to Kiro** - paper plane (`M22 2L11 13M22 2l-7 20-4-9-9-4z`) - existing
- **Copy Markdown** - file-text (`M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z` + lines) - matches doc/notes theme
- **Download Report** - download (`M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4` + arrow down) - universal download action

## Settings Integration

Add `includeScreenshots` to the existing `vg-settings` storage key:
```js
{ html: false, screenshot: false, includeScreenshots: false }
```

When `includeScreenshots` is false, "Download Report" generates markdown-only ZIP (no screenshots/ folder).
