# ViewGraph — Technical Design Document

**Date:** 2026-04-08
**Status:** Concept — ready for implementation
**Scope:** Firefox extension + MCP server + Kiro integration

---

## Vision

A seamless, bidirectional pipeline between a browser extension and Kiro IDE/CLI
via MCP. The extension captures any web page's DOM structure and full-page
hi-res screenshots, writes them to disk, and exposes them to Kiro via MCP tools.
Kiro can also request captures on demand — the MCP server acts as a request
bridge, queuing capture requests that the extension polls and fulfills.

This enables AI-powered UI auditing, test generation, visual regression,
design reference, and on-demand remote capture from the IDE.

```
Firefox Extension                    Disk                    MCP Server                 Kiro
─────────────────                    ────                    ──────────                 ────
Click capture button ──► Write JSON+PNG ──► Watches folder ──► Exposes as MCP tools
  or fulfill request     viewgraph-captures/     Indexes captures    get_latest_capture()
                                            Parses metadata     list_captures()
                                                                get_capture(id)
                                                                get_page_summary()
                                                                get_elements_by_role()
                                                                compare_captures()
                                                                get_elements_missing_testid()
                                                                         │
                         ◄── GET /pending ◄─── Request Queue ◄── request_capture()
                         ──► POST /capture ──►                   get_request_status()
                                                                         │
                                                                         ▼
                                                                Kiro calls tools in chat:
                                                                "Audit this page for a11y"
                                                                "Capture localhost:8040 now"
                                                                "Compare with yesterday"
```

---

## Component 1: Firefox Extension (ViewGraph Capture)

### What It Captures

The extension traverses the live DOM and produces a structured JSON + optional
full-page PNG screenshot:

| Section | Content | Purpose |
|---|---|---|
| `METADATA` | URL, title, viewport, timestamp, device pixel ratio, screenshot filename | Context for the capture |
| `NODES` | Every DOM element by salience (high/med/low), with tag, parent/child, actions (clickable, editable), cluster membership | Structural understanding |
| `SUMMARY` | Page styles (colors, fonts), layout grid, spatial clusters, element summaries with bounding boxes | Quick overview for LLM |
| `RELATIONS` | Parent-child, sibling, visual grouping relationships between elements | Semantic structure |
| `DETAILS` | Full CSS selectors, HTML attributes (including data-testid, aria-*), computed styles per element | Precise identification |
| `SCREENSHOT` | Full-page PNG saved alongside JSON (same basename, `.png` extension) | Visual reference, regression diffing |

### Capture Modes and UX Flow

The extension popup replaces the single "Select Element" button (from Element-to-LLM)
with a mode switcher. Modes are split into two tiers based on workflow:

**Tier 1 — Quick-fire (immediate, one-click, no annotation step):**

| Mode | Icon | Behavior | Output |
|---|---|---|---|
| 📸 Screenshot | Camera | Immediate full-page scroll-stitch PNG | PNG only |
| 📋 ViewGraph Capture | Document | Immediate DOM traverse + screenshot | JSON + PNG |
| 🎯 Select Element | Crosshair | Enter hover-inspect mode, click to capture one element subtree | JSON (subtree) + element screenshot |

**Tier 2 — Review Mode (batch, annotate, then send):**

| Mode | Icon | Behavior | Output |
|---|---|---|---|
| 🔲 Select Region | Rectangle | Drag to draw rectangle, nodes underneath highlighted, attach annotation | JSON (selected nodes) + region screenshot + annotations |
| 📝 Review Mode | Clipboard | Combines hover-inspect + region-select + annotations. Accumulate multiple selections, annotate each, preview all, then Send/Save | Full annotated capture bundle |

**Why two tiers:** Quick-fire modes cover the "I just need a capture right now"
workflow — zero friction, fires immediately, saves to disk and pushes to MCP.
Review Mode covers the "I want to mark up this page with change requests and
send it to Kiro" workflow — you build up a set of annotated selections, review
them, then publish as a bundle.

**Popup UI layout:**

```
┌─────────────────────────────────┐
│  ViewGraph Capture                   │
│                                 │
│  ┌───────┐ ┌───────┐ ┌───────┐ │
│  │  📸   │ │  📋   │ │  🎯   │ │  ← Quick-fire row
│  │ Shot  │ │ ViewGraph  │ │ Elem  │ │
│  └───────┘ └───────┘ └───────┘ │
│                                 │
│  ┌─────────────────────────────┐│
│  │  📝 Review Mode             ││  ← Enters full review flow
│  │  (select, annotate, send)   ││
│  └─────────────────────────────┘│
│                                 │
│  Status: Ready                  │
│  Output: VIEWGRAPH (v2) ▼           │
│  ☑ Save to file                 │
│  ☑ Push to MCP                  │
│                                 │
│  Last: 2 min ago (localhost)    │
└─────────────────────────────────┘
```

### Hover Inspector

When in Select Element mode or Review Mode, the hover inspector activates.
Moving the mouse over the page highlights elements with a colored overlay and
shows a rich tooltip with element metadata.

**Tooltip contents:**
- Tag name + semantic role (e.g., `<button> role="button"`)
- Accessible name if present (e.g., `"View Chain"`)
- `data-testid` if present
- Bounding box dimensions (e.g., `99×36`)
- Nesting depth indicator (e.g., `depth: 5`)

**DOM tree navigation via scroll wheel:**
The hover inspector defaults to the leaf (deepest) element under the cursor.
Scrolling the mouse wheel walks the DOM tree:
- Scroll up → select parent element
- Scroll down → return to child / leaf
- The overlay outline changes color at each nesting level to indicate depth:
  blue (leaf) → green (parent) → orange (grandparent) → red (deeper ancestors)
- The tooltip updates in real-time to show the currently selected ancestor
- Press Enter or click to confirm selection at the current nesting level
- Press Escape to cancel

```
┌─────────────────────────────────────────────┐
│  ┌─ orange ─────────────────────────────┐   │
│  │  ┌─ green ────────────────────────┐  │   │
│  │  │  ┌─ blue (current) ────────┐   │  │   │
│  │  │  │  <button> "View Chain"  │   │  │   │
│  │  │  │  data-testid: view-chain│   │  │   │
│  │  │  │  99×36  depth: 5        │   │  │   │
│  │  │  └─────────────────────────┘   │  │   │
│  │  └────────────────────────────────┘  │   │
│  └──────────────────────────────────────┘   │
│  ▲ scroll up = select parent                │
│  ▼ scroll down = select child               │
└─────────────────────────────────────────────┘
```

**Implementation:** The inspector injects a transparent overlay `<div>` positioned
absolutely over the hovered element. A `mousemove` listener on `document` performs
`document.elementFromPoint(x, y)` to find the leaf element, then walks up via
`parentElement` based on the current scroll-wheel offset. Shadow DOM is pierced
via `shadowRoot.elementFromPoint()` for open shadow roots.

### Drag-Select and Region Capture

In Review Mode, the user can drag to draw a selection rectangle over any area
of the page. All DOM nodes whose bounding boxes intersect the rectangle are
highlighted and captured.

**Flow:**
1. Hold Shift + click-drag to draw a rectangle (blue dashed outline)
2. On mouse-up, all intersecting elements are highlighted with semi-transparent overlay
3. A floating annotation panel appears anchored to the selection (see Annotation System)
4. The selection is numbered (e.g., `①`, `②`) and persists on the page as a colored overlay
5. Multiple regions can be selected on the same page
6. Click a numbered marker to re-open its annotation panel
7. Selections can be resized by dragging edges, or deleted via the annotation panel

**Node intersection logic:** For each visible element in the DOM, compare its
`getBoundingClientRect()` against the selection rectangle. An element is included
if its bbox overlaps the selection by ≥50% of the element's area (avoids capturing
large background containers that technically intersect but aren't the target).

### Annotation System

Each selection (element or region) can have an annotation — a text comment
describing the desired change, bug, or observation. Annotations are the core
value of Review Mode: they turn a capture into actionable feedback for Kiro.

**Floating annotation panel (appears on selection):**

```
┌──────────────────────────────────┐
│ ① Selection: 3 elements          │
│ ┌──────────────────────────────┐ │
│ │ <div.card> Job Configuration │ │
│ │ <div.table> Recent Job Runs  │ │
│ │ <table> runs-table           │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Add pagination to this table │ │
│ │ and make error details       │ │
│ │ collapsible                  │ │
│ └──────────────────────────────┘ │
│                                  │
│  [Save]  [Delete Selection]      │
└──────────────────────────────────┘
```

**Annotation sidebar (Review Mode):**
A collapsible sidebar lists all annotations for the current review session.
Each entry shows the selection number, element summary, and comment preview.
Clicking an entry scrolls to and highlights that selection on the page.

**Annotation data model:**

```json
{
  "annotations": [
    {
      "id": "ann-1",
      "type": "region",
      "region": { "x": 300, "y": 400, "w": 800, "h": 200 },
      "selectedNodes": [
        { "uid": "n:div:job-config", "tag": "div", "role": "region", "name": "Job Configuration" },
        { "uid": "n:div:recent-runs", "tag": "div", "name": "Recent Job Runs" },
        { "uid": "n:table:runs-table", "tag": "table", "role": "table" }
      ],
      "comment": "Add pagination to this table and make error details collapsible",
      "timestamp": "2026-04-08T07:15:00Z"
    },
    {
      "id": "ann-2",
      "type": "element",
      "selectedNodes": [
        { "uid": "n:btn:view-chain", "tag": "button", "name": "View Chain" }
      ],
      "comment": "This button should open in a side panel, not navigate away",
      "timestamp": "2026-04-08T07:15:30Z"
    }
  ]
}
```

**Delete flow:** Each annotation panel has a "Delete Selection" button. Clicking
it removes the overlay, the annotation, and the sidebar entry. Keyboard shortcut:
select a numbered marker and press Delete.

### Salience Classification

Elements are ranked by interactivity and visual importance:
- **High**: primary CTAs, navigation links, form submit buttons
- **Medium**: secondary controls, content containers, icons, table cells
- **Low**: decorative elements, wrappers, hidden elements

### Full-Page Screenshot Capture

The extension captures a full-page hi-res PNG alongside the JSON. Since
`browser.tabs.captureVisibleTab()` only captures the visible viewport, the
extension uses a scroll-and-stitch approach:

1. Content script reads `document.documentElement.scrollHeight` and `scrollWidth`
2. Scrolls to each viewport-height offset (top → bottom)
3. At each offset, messages background script to call `captureVisibleTab({ format: 'png' })`
4. Collects all base64 PNG slices
5. Stitches slices on an OffscreenCanvas at full resolution
6. Exports final PNG via `canvas.toBlob()`

**Resolution:** `captureVisibleTab` respects `window.devicePixelRatio`, so on a
2x display the output is automatically 2x. The `screenshotScale` setting allows
forcing a specific scale factor.

**Caveats:**
- Visible scroll occurs during capture — pages with scroll-triggered animations
  or lazy-loaded content may produce artifacts
- A configurable `scrollDelay` (default 150ms) between scroll and capture
  mitigates most timing issues
- Sticky/fixed headers and footers are detected and only captured once to avoid
  duplication in the stitched output
- Very tall pages (>20 viewport heights) are capped with a warning in metadata

```javascript
// lib/screenshotter.js — scroll-and-stitch core loop
async function captureFullPage(tabId) {
  const { scrollHeight, viewportHeight } = await getPageDimensions(tabId);
  const slices = [];
  for (let y = 0; y < scrollHeight; y += viewportHeight) {
    await scrollTo(tabId, y);
    await delay(settings.scrollDelay);
    const dataUrl = await browser.tabs.captureVisibleTab({ format: 'png' });
    slices.push({ y, dataUrl });
  }
  return stitchSlices(slices, scrollHeight);
}
```

### Output Format

The JSON output varies by capture mode. Quick-fire modes produce the standard
ViewGraph format. Review Mode adds an `ANNOTATIONS` section and optional
`SELECTIONS` for region captures.

**Standard capture (Screenshot, ViewGraph Capture, Select Element):**

```json
{
  "====METADATA====": {
    "format": "viewgraph-v2",
    "captureMode": "viewgraph-capture",
    "timestamp": "2026-04-08T06:08:15.214Z",
    "url": "http://localhost:8040/projects",
    "title": "Projects - AI Video Editor",
    "viewport": { "width": 1696, "height": 799 },
    "screenshot": "viewgraph-localhost-2026-04-08T060815.png",
    "stats": {
      "totalNodes": 375,
      "salience": { "high": 6, "med": 286, "low": 83 },
      "clusters": 75
    }
  },
  "====NODES====": { ... },
  "====SUMMARY====": { ... },
  "====RELATIONS====": { ... },
  "====DETAILS====": { ... }
}
```

**Review Mode capture (with annotations and region selections):**

```json
{
  "====METADATA====": {
    "format": "viewgraph-v2",
    "captureMode": "review",
    "timestamp": "...",
    "url": "...",
    "title": "...",
    "viewport": { ... },
    "screenshot": "...",
    "stats": { ... },
    "annotationCount": 2
  },
  "====NODES====": { ... },
  "====SUMMARY====": { ... },
  "====RELATIONS====": { ... },
  "====DETAILS====": { ... },
  "====ANNOTATIONS====": [
    {
      "id": "ann-1",
      "type": "region",
      "region": { "x": 300, "y": 400, "w": 800, "h": 200 },
      "selectedNodes": ["n:div:job-config", "n:div:recent-runs"],
      "comment": "Add pagination and make error details collapsible",
      "timestamp": "2026-04-08T07:15:00Z"
    },
    {
      "id": "ann-2",
      "type": "element",
      "selectedNodes": ["n:btn:view-chain"],
      "comment": "Open in side panel instead of navigating away",
      "timestamp": "2026-04-08T07:15:30Z"
    }
  ]
}
```

### Extension Architecture

```
Firefox Extension
├── manifest.json          (Manifest V3)
├── background.js          (service worker: orchestrates capture + mode dispatch)
├── content.js             (content script: DOM traversal + salience scoring)
├── popup.html/js          (extension popup: mode switcher + status + settings)
├── lib/
│   ├── traverser.js       (DOM tree walker with depth/salience control)
│   ├── salience.js        (element importance scoring: size, interactivity, visibility)
│   ├── clusterer.js       (spatial clustering of related elements)
│   ├── style-extractor.js (computed style extraction: colors, fonts, layout)
│   ├── serializer.js      (JSON output formatter)
│   ├── screenshotter.js   (scroll-and-stitch full-page PNG capture)
│   ├── request-poller.js  (polls MCP server for pending capture requests)
│   ├── inspector.js       (hover inspector: overlay, tooltip, scroll-wheel DOM walking)
│   ├── region-selector.js (drag-select rectangle, node intersection, resize handles)
│   └── annotation-manager.js (annotation CRUD, floating panel, data model)
├── ui/
│   ├── overlay.css        (inspector highlights, region overlays, nesting colors)
│   ├── annotation-panel.js (floating comment panel component)
│   └── review-sidebar.js  (annotation list sidebar for Review Mode)
└── options/
    └── options.html/js    (settings: output directory, auto-capture, filters)
```

### Extension Settings

| Setting | Default | Description |
|---|---|---|
| `outputDir` | `~/Downloads/viewgraph-captures/` | Where JSON and PNG files are saved |
| `filenamePattern` | `viewgraph-{hostname}-{timestamp}.json` | Output filename template (PNG uses same basename) |
| `autoCapture` | false | Capture on every page load (for regression) |
| `salience.minLevel` | `low` | Minimum salience to include (low/med/high) |
| `maxNodes` | 500 | Cap on total nodes to prevent huge files |
| `includeStyles` | true | Include computed styles in DETAILS |
| `includeSelectors` | true | Include CSS selectors in DETAILS |
| `mcpEndpoint` | `null` | MCP server HTTP base URL (enables push + polling) |
| `screenshot.enabled` | true | Capture full-page PNG alongside JSON |
| `screenshot.scale` | `auto` | Screenshot scale factor (`auto` = devicePixelRatio, or 1/2/3) |
| `screenshot.scrollDelay` | 150 | Milliseconds to wait between scroll and capture |
| `screenshot.maxViewports` | 20 | Max viewport-heights to capture (caps very tall pages) |
| `pollInterval` | 3000 | Milliseconds between polls to `GET /pending` (0 = disabled) |
| `requestTimeout` | 30000 | Max ms to wait for a requested capture to complete |
| `defaultMode` | `viewgraph-capture` | Default capture mode on popup open (`screenshot`, `viewgraph-capture`, `select-element`, `review`) |
| `inspector.tooltipFields` | `["tag","role","name","testid","bbox"]` | Fields shown in hover inspector tooltip |
| `inspector.nestingColors` | `["#3b82f6","#22c55e","#f97316","#ef4444"]` | Overlay colors for nesting levels (leaf → ancestor) |
| `region.overlapThreshold` | 0.5 | Min fraction of element area that must intersect selection rectangle |
| `review.autoSave` | false | Auto-save annotations to disk as you create them (vs only on Send) |

### Dual Output Mode

The extension supports both output modes simultaneously:

**Disk mode (always on):** Saves JSON + PNG to `outputDir`. Works offline, no server needed.

**MCP push mode (optional):** If `mcpEndpoint` is configured, also POSTs the JSON
to the MCP server's HTTP endpoint. Screenshot PNG is base64-encoded in the
payload under `screenshot` key. This enables real-time notification without
file watching latency.

```javascript
// In background.js after capture completes:
async function outputCapture(json, screenshotBlob) {
  const basename = generateFilename(json);

  // Always write JSON to disk
  const jsonBlob = new Blob([JSON.stringify(json)], { type: 'application/json' });
  await browser.downloads.download({
    url: URL.createObjectURL(jsonBlob),
    filename: `viewgraph-captures/${basename}.json`,
  });

  // Write screenshot PNG to disk (if enabled)
  if (screenshotBlob) {
    await browser.downloads.download({
      url: URL.createObjectURL(screenshotBlob),
      filename: `viewgraph-captures/${basename}.png`,
    });
  }

  // Optionally push to MCP server
  if (settings.mcpEndpoint) {
    try {
      const payload = { ...json };
      if (screenshotBlob) {
        payload.screenshot = await blobToBase64(screenshotBlob);
      }
      await fetch(`${settings.mcpEndpoint}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // MCP server not running — silent fail, disk write already succeeded
    }
  }
}
```

### MCP Request Listener (Polling)

When `mcpEndpoint` is configured, the extension also polls the MCP server for
pending capture requests. This enables Kiro to remotely trigger captures.

The extension polls `GET /pending` every `pollInterval` ms. When a request is
found, the extension navigates to the URL (or captures the current tab if it
matches), performs the capture, and POSTs the result back.

```javascript
// lib/request-poller.js
let polling = false;

export function startPolling(endpoint, interval) {
  if (polling) return;
  polling = true;
  setInterval(async () => {
    try {
      const res = await fetch(`${endpoint}/pending`);
      if (!res.ok) return;
      const request = await res.json();
      if (!request.id) return;
      // Acknowledge the request
      await fetch(`${endpoint}/ack/${request.id}`, { method: 'POST' });
      // Perform capture (triggers normal capture flow)
      await performCapture(request);
    } catch (e) {
      // MCP server unreachable — skip this cycle
    }
  }, interval);
}
```

**Request lifecycle from extension's perspective:**
1. Poll `GET /pending` → receives `{ id, action, url?, options? }`
2. ACK via `POST /ack/:id` → server marks request as `in_progress`
3. Perform capture (DOM + screenshot)
4. POST result to `/capture` with `request_id` field → server marks as `completed`

---

## Component 2: MCP Server (viewgraph-mcp-server)

### Architecture

A Node.js MCP server that:
1. Watches the captures folder on disk for new files
2. Optionally receives captures via HTTP POST (from extension push mode)
3. Indexes all captures in memory (metadata + file path)
4. Exposes MCP tools for Kiro to query captures

```
viewgraph-mcp-server/
├── package.json
├── index.js               (MCP server entry point)
├── src/
│   ├── watcher.js         (fs.watch on captures directory)
│   ├── indexer.js          (parse metadata, maintain in-memory index)
│   ├── http-receiver.js   (HTTP endpoint: capture push + request bridge)
│   ├── request-queue.js   (in-memory queue for pending capture requests)
│   ├── tools/
│   │   ├── list-captures.js
│   │   ├── get-capture.js
│   │   ├── get-latest.js
│   │   ├── get-page-summary.js
│   │   ├── get-elements-by-role.js
│   │   ├── compare-captures.js
│   │   ├── find-missing-testids.js
│   │   ├── audit-accessibility.js
│   │   ├── request-capture.js
│   │   └── get-request-status.js
│   └── parsers/
│       ├── viewgraph-v2.js     (parse ViewGraph v2 format)
│       └── summary.js     (extract human-readable summary from capture)
```

### MCP Tools

| Tool | Input | Output | Use Case |
|---|---|---|---|
| `list_captures` | `{ limit?, url_filter? }` | Array of `{ filename, url, title, timestamp, node_count }` | Browse available captures |
| `get_latest_capture` | `{ url_filter? }` | Full ViewGraph JSON (or summary if too large) | Quick access to most recent |
| `get_capture` | `{ filename }` | Full ViewGraph JSON | Access specific capture |
| `get_page_summary` | `{ filename }` | `{ url, title, layout, styles, element_counts, clusters }` | Quick overview without full JSON |
| `get_elements_by_role` | `{ filename, role }` | Elements matching role: buttons, links, inputs, headings, images | Targeted element queries |
| `get_interactive_elements` | `{ filename }` | All clickable/editable elements with selectors and labels | Test generation input |
| `find_missing_testids` | `{ filename }` | Interactive elements that lack `data-testid` attribute | Test coverage audit |
| `audit_accessibility` | `{ filename }` | Elements missing: aria-label, alt text, form labels, focus indicators | A11y audit |
| `compare_captures` | `{ file_a, file_b }` | Diff: added/removed elements, layout shifts, style changes, new/missing testids | Visual regression |
| `get_elements_near` | `{ filename, bbox }` | Elements within a bounding box region | Spatial queries |
| `request_capture` | `{ url?, screenshot?, options? }` | `{ request_id, status: "pending" }` | Kiro requests a capture from the extension |
| `get_request_status` | `{ request_id }` | `{ status, capture_filename?, error? }` | Poll for request completion |
| `get_annotations` | `{ filename }` | Array of annotations with comments, selected nodes, regions | Retrieve review annotations from a capture |
| `get_annotated_capture` | `{ filename, annotation_id? }` | Capture JSON filtered to annotated nodes + their comments | Focused view of what the user flagged |

### Tool Detail: `compare_captures`

This is the most powerful tool. Given two captures (e.g., before and after a code change):

```json
{
  "added_elements": [
    { "id": "btn004", "tag": "button", "text": "Delete", "selector": "..." }
  ],
  "removed_elements": [
    { "id": "span012", "tag": "span", "text": "Beta", "selector": "..." }
  ],
  "layout_changes": [
    { "element": "div005", "before": { "x": 100, "width": 400 }, "after": { "x": 100, "width": 500 } }
  ],
  "style_changes": [
    { "element": "btn001", "property": "background-color", "before": "#6366f1", "after": "#ef4444" }
  ],
  "testid_changes": {
    "added": ["delete-project-btn"],
    "removed": ["beta-badge"]
  }
}
```

### File Watcher

```javascript
// watcher.js
import { watch } from 'fs';
import { readFile } from 'fs/promises';

export function watchCaptures(dir, onNewCapture) {
  watch(dir, async (eventType, filename) => {
    if (eventType === 'rename' && filename.endsWith('.json')) {
      const data = await readFile(`${dir}/${filename}`, 'utf-8');
      const parsed = JSON.parse(data);
      onNewCapture(filename, parsed);
    }
  });
}
```

### HTTP Receiver

The HTTP server handles both inbound captures and the request bridge for
bidirectional communication with the extension.

**Endpoints:**

| Method | Path | Purpose |
|---|---|---|
| `POST /capture` | Extension pushes capture result (JSON + optional base64 screenshot) |
| `GET /pending` | Extension polls for next pending capture request |
| `POST /ack/:id` | Extension acknowledges it's working on a request |

```javascript
// http-receiver.js
import { createServer } from 'http';

export function startHttpReceiver(port, { onCapture, requestQueue }) {
  createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (req.method === 'POST' && url.pathname === '/capture') {
        const data = JSON.parse(body);
        const filename = `viewgraph-push-${Date.now()}.json`;
        onCapture(filename, data);
        if (data.request_id) requestQueue.complete(data.request_id, filename);
        res.writeHead(200);
        res.end('OK');
      } else if (req.method === 'GET' && url.pathname === '/pending') {
        const next = requestQueue.next();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(next || {}));
      } else if (req.method === 'POST' && url.pathname.startsWith('/ack/')) {
        const id = url.pathname.split('/')[2];
        requestQueue.ack(id);
        res.writeHead(200);
        res.end('OK');
      } else {
        res.writeHead(404);
        res.end();
      }
    });
  }).listen(port);
}
```

### Request Queue

In-memory queue that bridges Kiro's `request_capture` tool calls to the
extension's polling loop.

**Request states:** `pending` → `in_progress` → `completed` | `expired`

```javascript
// request-queue.js
export class RequestQueue {
  constructor(ttl = 30000) {
    this.requests = new Map();
    this.ttl = ttl;
  }

  create(options) {
    const id = `req-${Date.now()}`;
    this.requests.set(id, { id, status: 'pending', options, created: Date.now() });
    return id;
  }

  next() {
    this.expireStale();
    for (const [, req] of this.requests) {
      if (req.status === 'pending') return req;
    }
    return null;
  }

  ack(id) {
    const req = this.requests.get(id);
    if (req) req.status = 'in_progress';
  }

  complete(id, filename) {
    const req = this.requests.get(id);
    if (req) { req.status = 'completed'; req.filename = filename; }
  }

  get(id) { return this.requests.get(id) || null; }

  expireStale() {
    const now = Date.now();
    for (const [id, req] of this.requests) {
      if (now - req.created > this.ttl && req.status !== 'completed') {
        req.status = 'expired';
      }
    }
  }
}
```

### Configuration

```json
// viewgraph-mcp-config.json
{
  "capturesDir": "/mnt/c/Users/sourj/Downloads/viewgraph-captures",
  "httpPort": 9090,
  "enableHttpReceiver": true,
  "maxCapturesInMemory": 50,
  "enableFileWatcher": true
}
```

---

## Component 3: Kiro Integration

### MCP Server Registration

In any project's `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "viewgraph": {
      "command": "node",
      "args": ["/home/sourjya/coding/viewgraph-mcp-server/index.js"],
      "env": {
        "VIEWGRAPH_CAPTURES_DIR": "/mnt/c/Users/sourj/Downloads/viewgraph-captures",
        "VIEWGRAPH_HTTP_PORT": "9090"
      }
    }
  }
}
```

### Usage Patterns in Kiro Chat

**UI Audit:**
```
You: Read the latest ViewGraph capture and audit for accessibility issues
Kiro: [calls audit_accessibility] Found 3 issues:
      - btn003 "Delete" has no aria-label
      - input "search" missing associated <label>
      - Color contrast 3.2:1 on .project-desc (needs 4.5:1)
```

**Test Coverage:**
```
You: Check which interactive elements are missing data-testid
Kiro: [calls find_missing_testids] 4 elements missing:
      - <button> "Cancel" in delete dialog
      - <a> "Settings" in sidebar
      - <input> search box
      - <select> tag filter dropdown
```

**Generate Tests:**
```
You: Generate Playwright tests for all buttons on this page
Kiro: [calls get_elements_by_role("button")] Found 8 buttons.
      [generates test code using selectors from capture]
```

**Visual Regression:**
```
You: Compare today's capture with yesterday's — what changed?
Kiro: [calls compare_captures] Changes detected:
      - Added: "Delete" button on each project row
      - Removed: "Beta" badge from header
      - Layout: project cards widened by 100px
      - Style: status badge font-size 12px → 14px
```

**Design Reference:**
```
You: This capture is the home-management job scheduler.
     Build our pipeline-jobs-viewer to match this layout pattern.
Kiro: [calls get_page_summary] I see a table with columns:
      Job Name, Status (badge), Last Run, Duration, Actions.
      Expandable rows with per-step detail...
      [generates component code matching the layout]
```

**Remote Capture (bidirectional):**
```
You: Capture localhost:8040/projects right now with a screenshot
Kiro: [calls request_capture({ url: "http://localhost:8040/projects", screenshot: true })]
      Request req-1712567783000 queued, waiting for extension...
      [calls get_request_status({ request_id: "req-1712567783000" })]
      Capture completed. 375 nodes, full-page screenshot (3392×2400px).
      What would you like me to do with it?
```

**Annotation-Driven Development:**
```
You: I just did a review capture of the job scheduler page with annotations.
     Read my annotations and implement the changes.
Kiro: [calls get_annotations] Found 2 annotations:
      ① Region (Job Config + Recent Runs table):
        "Add pagination and make error details collapsible"
      ② Element (View Chain button):
        "Open in side panel instead of navigating away"
      [calls get_annotated_capture for full node details]
      I'll implement these changes. Starting with the pagination...
```

---

## Data Flow Diagram

```
┌──────────────────────────┐
│  Firefox Browser          │
│                           │
│  User clicks ViewGraph button  │
│  ── OR ──                 │
│  Poller receives request  │
│  from MCP server          │
│         │                 │
│         ▼                 │
│  content.js               │
│  traverses DOM            │
│  scores salience          │
│  clusters elements        │
│  extracts styles          │
│         │                 │
│         ▼                 │
│  screenshotter.js         │
│  scroll-and-stitch PNG    │
│         │                 │
│         ▼                 │
│  background.js            │
│  serializes JSON + PNG    │
│         │                 │
│    ┌────┴────┐            │
│    │         │            │
│    ▼         ▼            │
│  Disk      HTTP POST      │
│  .json     /capture       │
│  .png      (JSON+base64)  │
│         ▲                 │
│         │                 │
│  request-poller.js        │
│  GET /pending ◄───────────┼──── MCP server queues request
│  POST /ack/:id ──────────►│
└────┬─────────┬────────────┘
     │         │
     ▼         ▼
┌──────────────────────────┐
│  viewgraph-mcp-server          │
│                           │
│  fs.watch ◄── disk        │
│  HTTP ◄──── push          │
│         │                 │
│  In-memory index          │
│  (metadata + paths)       │
│         │                 │
│  Request Queue            │
│  pending → in_progress    │
│  → completed / expired    │
│         │                 │
│  MCP Tools:               │
│  list, get, compare,      │
│  audit, find_missing,     │
│  request_capture,         │
│  get_request_status       │
└─────────┬────────────────┘
          │ MCP protocol
          ▼
┌──────────────────────────┐
│  Kiro IDE / CLI           │
│                           │
│  User: "Audit the         │
│  latest capture"          │
│  ── OR ──                 │
│  User: "Capture           │
│  localhost:8040 now"      │
│         │                 │
│  Kiro calls MCP tool      │
│  request_capture /        │
│  get_latest_capture       │
│         │                 │
│  LLM analyzes JSON + PNG  │
│  returns findings         │
└──────────────────────────┘
```

---

## Firefox Extension Best Practices and Pitfalls

Key findings from research on Firefox MV3 extension development.

### MV3 Service Worker Lifecycle

Service workers terminate after ~5 minutes of inactivity. This is the single
biggest architectural change from MV2 and breaks most legacy patterns.

**What breaks:**
- Global variables are lost on restart — use `chrome.storage.local` instead
- `setInterval` for periodic tasks stops — use `chrome.alarms` instead
- In-memory state disappears without warning
- WebSocket connections drop on termination

**Mitigation:**
```javascript
// DON'T: State lost when service worker terminates
let captureState = {};

// DO: Persist to chrome.storage
async function saveState(data) {
  await chrome.storage.local.set({ captureState: data });
}
```

### Firefox-Specific Pitfalls

1. **`captureVisibleTab` is broken in Firefox MV3.** There's a known bug where
   it returns undefined even with correct permissions. Workaround: ensure
   `<all_urls>` is in `host_permissions` AND `activeTab` in `permissions`.
   Test thoroughly on Firefox before relying on this API.

2. **Firefox cannot access localhost.** This breaks dev hot-reload for frameworks
   like WXT. Workaround: develop in Chrome, build and validate in Firefox.
   This is a 2+ year old Bugzilla issue with no fix in sight.

3. **CSP restrictions on content scripts.** Firefox restricts extension-injected
   content scripts based on the website's own CSP — a 9-year-old bug. Workaround:
   use `declarativeNetRequest` to strip CSP headers from target sites.

4. **Extensions must be signed.** Unlike Chrome, Firefox requires all extensions
   to be submitted to AMO (addons.mozilla.org) for signing, even for personal use.
   Unsigned extensions cannot be installed except in Developer Edition/Nightly.

5. **AMO review is slow.** Manual review is required above a certain user threshold.
   Reviewers may not be experienced extension developers. Plan for multi-day
   review cycles on updates.

### Permissions Strategy

Over-permissioning is the #1 reason for store rejection and user distrust.

- Request `activeTab` + `storage` upfront (minimal friction)
- Use `optional_permissions` for features like `tabs`, `history`
- Request optional permissions contextually when the user needs the feature
- Avoid `<all_urls>` in permissions — use specific host patterns
- `host_permissions` are shown to users at install time

### Performance Targets

| Metric | Target | Why |
|---|---|---|
| Extension size | < 3MB | Store requirement |
| Content script injection | < 100ms | User experience |
| Popup open time | < 500ms | User experience |
| Service worker startup | < 200ms | Capture responsiveness |

### Development Framework

WXT (`wxt.dev`) is recommended for this project:
- Vite-based build with HMR (Chrome only — Firefox lacks localhost access)
- Automatic manifest generation from code
- Cross-browser builds from single codebase
- Built-in TypeScript support
- Handles MV3 service worker lifecycle automatically

### Security Checklist

- Never use `eval()` or `new Function()`
- Sanitize all user inputs before DOM insertion — use `textContent` over `innerHTML`
- Implement strict Content Security Policy in manifest
- Pin dependency versions, run `npm audit` regularly
- Encrypt sensitive data before storage
- Use `chrome.storage.local` for sensitive data (not `sync`)

---

## MCP Server Best Practices and Pitfalls

Key findings from research on building production MCP servers with Node.js.

### Transport Selection

| Scenario | Transport |
|---|---|
| Local dev / Kiro CLI integration | stdio |
| Single-user desktop (Kiro IDE) | stdio |
| Team access / shared server | Streamable HTTP |
| Remote / cloud deployment | Streamable HTTP |

Start with stdio for this project (Kiro spawns the server as a child process).
Move to Streamable HTTP only if multi-user access is needed later.

### Critical Rule: stdout is Sacred

In stdio transport, `stdout` is reserved for JSON-RPC messages. Any stray
`console.log()` corrupts the protocol stream and crashes the connection silently.

```javascript
// WRONG — breaks the protocol
console.log('Server starting');

// CORRECT — use stderr for all logging
console.error('Server starting');
```

Audit every dependency for stdout pollution. Redirect logging frameworks to stderr.

### Tool Design Principles

1. **Descriptions are prompts, not docs.** The LLM reads tool descriptions to
   decide when and how to use each tool. Write them as instructions for a new
   employee: include trigger conditions, input formats, output shape, and side effects.

2. **Keep tools focused.** LLM tool selection degrades above ~15 tools per server.
   Each tool should do one thing well. The LLM chains multiple simple tools
   effectively; it handles one overloaded tool poorly.

3. **Use verb-noun naming.** `list_captures` not `captures`. `get_page_summary`
   not `page_summary`. Common verbs: get, list, search, create, update, delete.

4. **Cap response sizes.** Target ~100KB max per response. The LLM's context
   window is finite — sending 50MB of JSON is worse than useless. Include
   metadata like "Found 847 entries (showing 100)" so the LLM knows to refine.

5. **Validate all inputs.** Use Zod schemas for type validation. Add business
   logic validation in handlers with user-friendly error messages.

### Error Handling

MCP defines two error categories:

- **`isError: true`** — Recoverable, application-level failure. The LLM sees the
  error message and can retry with different parameters or try a different tool.
  Use for: file not found, invalid query, permission denied.

- **Thrown `McpError`** — Protocol-level, hard failure. Use for: invalid params
  that bypass Zod, security violations, impossible states.

```javascript
// Recoverable — LLM can act on this
return {
  content: [{ type: 'text', text: 'Error: Capture not found. Use list_captures to see available files.' }],
  isError: true
};

// Hard failure — security violation
throw new McpError(ErrorCode.InvalidParams, 'Path traversal not allowed');
```

### File System Security

All file paths must be validated against an allowed root directory:

```javascript
const ALLOWED_ROOT = process.env.VIEWGRAPH_CAPTURES_DIR;

function validatePath(filePath) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(ALLOWED_ROOT))) {
    throw new McpError(ErrorCode.InvalidParams, 'Path outside allowed directory');
  }
  return resolved;
}
```

### Testing Strategy

1. **Unit tests** — Extract business logic from handlers, test independently
2. **Integration tests** — Use `InMemoryTransport` from the SDK to test full
   tool lifecycle (registration, discovery, validation, execution)
3. **Manual testing** — Use Kiro CLI with the MCP server registered

```javascript
const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
const result = await client.callTool('list_captures', { limit: 5 });
```

### Graceful Shutdown

Close file watchers, database connections, and HTTP servers on SIGINT/SIGTERM:

```javascript
process.on('SIGINT', async () => {
  console.error('Shutting down...');
  watcher.close();
  httpServer.close();
  process.exit(0);
});
```

---

## Annotation + Format Combination

### How Annotations Merge with Capture Formats

Annotations are **not a separate format** — they are a layer that attaches to
any capture format. The capture JSON is the structural truth (DOM, selectors,
styles, layout). Annotations are the human intent layer on top: "what I want
changed, and where."

The combination works like this:

```
Capture (structural truth)          Annotations (human intent)
──────────────────────────          ──────────────────────────
NODES: element tree with UIDs  ◄──  selectedNodes: [uid references]
DETAILS: selectors, styles     ◄──  region: { bbox coordinates }
SUMMARY: layout, clusters      ◄──  comment: "change request text"
METADATA: url, viewport        ◄──  timestamp, annotation ID
```

Annotations reference nodes by UID. This means:
- An annotation on a button references `n:btn:view-chain` — the same UID that
  appears in NODES, DETAILS, and RELATIONS
- A region annotation includes a bbox AND the UIDs of all nodes within it
- Kiro can resolve any annotation to its full structural context by joining
  the annotation's `selectedNodes` against the capture's NODES/DETAILS sections

### What Kiro Needs to Understand the Output

Kiro doesn't need special training or a custom parser. The MCP tools abstract
the format entirely. Here's the contract:

**For standard captures (no annotations):**
Kiro calls `get_capture` or `get_page_summary` → receives structured JSON →
reasons about it directly. The ViewGraph format's section headers (`====NODES====`,
`====DETAILS====`) are self-describing. Kiro already handles JSON natively.

**For annotated captures (Review Mode):**
Kiro calls `get_annotations` → receives a flat list of annotations with comments
and node references. Each annotation is self-contained:

```json
{
  "id": "ann-1",
  "comment": "Add pagination to this table",
  "selectedNodes": [
    {
      "uid": "n:table:runs-table",
      "tag": "table",
      "role": "table",
      "name": "Recent Job Runs",
      "selector": "table[data-testid='runs-table']",
      "bbox": { "x": 300, "y": 400, "w": 800, "h": 200 }
    }
  ],
  "region": { "x": 300, "y": 400, "w": 800, "h": 200 }
}
```

Kiro sees: "the user wants pagination on this specific table, here's its
selector and position." That's enough to act on — find the component in the
codebase, implement the change.

**For the `get_annotated_capture` tool:**
Returns the full capture JSON but filtered to only the nodes referenced by
annotations. This is the "focused view" — instead of 375 nodes, Kiro gets
the 5-10 nodes the user actually cares about, with their full details and
the user's comments. This keeps context tight.

### Format Extensibility

The annotation layer is format-agnostic. If the capture format changes from
ViewGraph v2 to a future bundle format (with accessibility trees, provenance, etc.),
annotations still work — they reference nodes by UID, and UIDs are stable
across format versions.

If a non-ViewGraph format is used (e.g., raw CDP DOMSnapshot), the MCP server's
parser normalizes it into the same node structure with UIDs, and annotations
attach identically.

### Kiro Steering for ViewGraph Captures

No special Kiro configuration is needed beyond the MCP server registration.
However, a steering doc can improve Kiro's behavior with captures:

```markdown
# ViewGraph Capture Handling (optional steering doc)

When working with ViewGraph captures via MCP tools:

1. Always call `get_annotations` first if the capture has `captureMode: "review"`
2. Use annotation comments as the primary task list — each annotation is a change request
3. Use `get_annotated_capture` for focused context instead of loading the full capture
4. Reference elements by their `data-testid` or `selector` from the capture, not by
   guessing selectors
5. After implementing changes, suggest the user re-capture to verify
```

This steering doc is optional — Kiro will work without it, but it improves
the workflow by teaching Kiro to prioritize annotations and use focused queries.

---

## Future: Capture Bundle Architecture

The Output Formats research doc identifies that no single representation format
gives an agent full layout understanding. The strongest approach is a **capture
bundle** — a set of complementary artifacts per capture, cross-referenced via
stable IDs and a shared coordinate frame. SIFR v2 already covers the DOM
structure + salience + selectors + computed styles layer. The following additions
would make it a full agentic-ready bundle:

**Accessibility tree snapshot:** A parallel tree to the DOM, capturing computed
accessible names, roles, states, and relations (label-for, described-by). This
is critical because accessible names are often not the same as DOM text content,
and many automation strategies rely on roles/names over CSS selectors. Captured
via browser accessibility APIs or CDP's Accessibility domain.

**Screenshot-to-element mapping:** Every node in the UI graph gets a `bbox` in a
declared coordinate frame (CSS pixels, viewport-relative). This grounds selectors
to pixels, enabling multimodal agents to plan clicks from screenshots. The
annotation system's region selections already produce this mapping naturally.

**Provenance and confidence tags:** Each captured field should indicate its source:
- `measured` — browser API reported (high confidence)
- `derived` — computed from measured fields (medium-high)
- `inferred` — ML/OCR/heuristic (variable)
- `user-provided` — test IDs, annotations (high if maintained)

This lets Kiro know which facts to trust and which to verify.

**Incremental diffs:** For streaming or repeated captures, JSON Patch (RFC 6902)
provides operation-based updates. This avoids resending the entire capture when
only a few elements changed — critical for regression workflows.

These additions are tracked as future phases and don't block the core
implementation. The current SIFR v2 format + annotations + screenshots already
provides a strong foundation for agentic coding workflows.

---

## Implementation Phases

### Phase 1: MCP Server (standalone, reads existing captures)
- File watcher on captures directory
- In-memory index of captures
- Core MCP tools: list, get_latest, get_capture, get_page_summary
- Register in Kiro MCP settings
- **Effort:** 1-2 days

### Phase 2: Analysis Tools
- find_missing_testids, audit_accessibility, get_elements_by_role
- compare_captures (diff two captures)
- **Effort:** 1-2 days

### Phase 3: Firefox Extension — Core (replaces Element-to-LLM)
- Popup UI with mode switcher (Screenshot, ViewGraph Capture, Select Element)
- DOM traversal with salience scoring
- Spatial clustering + style extraction
- Full-page scroll-and-stitch screenshot capture
- Dual output: disk (JSON + PNG) + HTTP push
- Extension settings page
- **Effort:** 3-5 days

### Phase 4: Hover Inspector + Select Element Mode
- Hover overlay with rich tooltip (tag, role, name, testid, bbox)
- Scroll-wheel DOM tree walking (leaf → parent → grandparent)
- Nesting-level color coding
- Click-to-capture element subtree
- **Effort:** 2-3 days

### Phase 5: Bidirectional Communication
- MCP server HTTP receiver with /capture, /pending, /ack/:id endpoints
- Request queue (in-memory, with expiry)
- request_capture and get_request_status MCP tools
- Extension request-poller polling loop
- **Effort:** 1-2 days

### Phase 6: Review Mode + Annotations
- Drag-select region capture with node intersection
- Floating annotation panel (comment, save, delete)
- Annotation sidebar with list view
- Review Mode: accumulate selections + annotations, then Send/Save
- ANNOTATIONS section in output JSON
- get_annotations and get_annotated_capture MCP tools
- **Effort:** 3-5 days

### Phase 7: Advanced Tools
- Generate Playwright test code from captures
- Generate component code matching a captured layout
- Track capture history for a URL over time (regression timeline)
- **Effort:** 2-3 days

### Phase 8: Capture Bundle Enhancements
- Accessibility tree snapshot capture (CDP Accessibility domain)
- Screenshot-to-element mapping (node UID → bbox region)
- Provenance and confidence tags per field
- Incremental diffs via JSON Patch
- **Effort:** 3-5 days

---

## Cross-Project Reuse

This tool is project-agnostic. It works with any web app:
- **ai-video-editor**: audit editor UI, generate timeline tests, verify PrimeNG rendering
- **home-management**: audit job scheduler, compare before/after refactors
- **gphotos**: audit photo gallery layout, verify responsive breakpoints
- **any new project**: instant UI analysis from day one

The MCP server and extension are standalone tools, not tied to any specific codebase.

---

## Decisions

1. **Shadow DOM:** Yes — pierce through shadow DOM to capture internal elements.
   PrimeNG's `<p-button>` resolves to the actual `<button>` inside.
2. **Screenshot:** Yes — full-page hi-res PNG via scroll-and-stitch. Configurable
   in extension settings (on/off, scale, scroll delay). Uses `captureVisibleTab`
   at each viewport offset, stitched on OffscreenCanvas. Respects devicePixelRatio
   for automatic hi-res on retina displays. Saved as `.png` alongside `.json`.
3. **Size limits:** Yes — MCP tools return summaries by default (`get_page_summary`).
   Full JSON only via explicit `get_capture`. Keeps LLM context manageable.
4. **Index persistence:** Rebuild from files on startup. No SQLite. Files are
   source of truth, index is an in-memory cache. <1s scan for 50 captures.
5. **Capture publish timing:** Two-tier model. Quick-fire modes (Screenshot, ViewGraph
   Capture, Select Element) publish immediately on click. Review Mode batches
   all selections and annotations, publishes only when user clicks Send/Save.
   This balances speed for simple captures with flexibility for annotated reviews.
6. **DOM tree navigation:** Scroll wheel on hover inspector walks parent chain.
   This avoids needing a separate tree panel and keeps the interaction spatial —
   you're always looking at the page, not a sidebar. Nesting depth shown via
   color-coded overlays (blue → green → orange → red).
7. **Region selection intersection:** 50% area overlap threshold by default.
   Prevents large background containers from being captured when the user draws
   a small rectangle over a specific component. Configurable via settings.
8. **Annotation storage:** Annotations are embedded in the capture JSON under
   `====ANNOTATIONS====`, not stored separately. This keeps captures self-contained
   and portable — one file = complete context for Kiro.
