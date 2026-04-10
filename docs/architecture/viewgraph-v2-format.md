# ViewGraph v2 Format Specification

**Version:** 2.2.0

**Date:** 2026-04-10

**Status:** Draft

**Authors:** ViewGraph Project

**Lineage:** Inspired by the SiFR v2 format from
[Element to LLM](https://addons.mozilla.org/en-US/firefox/addon/element-to-llm/)
(Insitu). See [viewgraph-format-research.md](./viewgraph-format-research.md)
for credits and analysis.

---

## 1. Overview

ViewGraph v2 is a JSON format for representing captured web page state -
structure, layout, styles, accessibility, and human annotations - optimized
for consumption by LLM-based coding agents via MCP tools.

### 1.1 Design goals

1. **LLM-first:** Minimize tokens for equivalent information. Progressive
   disclosure - summary first, details on demand.
2. **Human-readable:** Full tag names, semantic node IDs, no abbreviations.
3. **Formally specified:** This document + a JSON Schema are the contract.
4. **Extensible:** New sections can be added without breaking existing parsers.
   Unknown sections MUST be ignored.
5. **Interoperable:** Optional export to standard formats (CDP DOMSnapshot,
   AX tree, W3C Web Annotation) via MCP tools.
6. **Deterministic:** Captures of the same page state should produce the same
   output. Node IDs, ordering, and coordinate frames are well-defined.

### 1.2 MIME type and file extension

- MIME: `application/vnd.viewgraph.v2+json`
- Extension: `.viewgraph.json`
- Legacy extension: `.json` (accepted by parsers)

### 1.3 Schema

A machine-readable JSON Schema (2020-12) is published at
`server/schemas/viewgraph-v2.schema.json`. Producers SHOULD validate output
against this schema. MCP tools MAY validate input captures on first parse.

The schema uses `$defs` for reusable section shapes (bbox, node, locator,
annotation) so that tooling can generate typed SDKs.

### 1.4 Serialization profiles

ViewGraph v2 has two serialization profiles sharing one logical model:

| Profile | Key | Use case |
|---|---|---|
| `readable` | Default. Nested objects, indented JSON. | Human inspection, debugging |
| `compact` | Columnar arrays + shared string table (CDP-style). | MCP transport, large captures, token optimization |

The `metadata.profile` field declares which serialization was used.
Parsers MUST support `readable`. Support for `compact` is RECOMMENDED.

---

## 2. Top-Level Structure

A ViewGraph v2 capture is a single JSON object with plain, dot-accessible keys.

```json
{
  "metadata":      { ... },
  "summary":       { ... },
  "nodes":         { ... },
  "relations":     { ... },
  "details":       { ... },
  "annotations":   [ ... ],
  "accessibility": { ... },
  "coverage":      { ... }
}
```

### 2.1 Section ordering

Sections MUST appear in this order. Parsers SHOULD NOT depend on order but
producers MUST emit in this order for LLM attention optimization.

| Order | Key | Required | Purpose |
|---|---|---|---|
| 1 | `metadata` | Yes | Capture context, viewport, stats, provenance |
| 2 | `summary` | Yes | Page overview, styles, clusters, key elements |
| 3 | `nodes` | Yes | Element tree grouped by salience tier |
| 4 | `relations` | Yes | Semantic and structural relationships |
| 5 | `details` | Yes | Full selectors, attributes, computed styles |
| 6 | `annotations` | No | Human annotations from review mode |
| 7 | `accessibility` | No | Computed accessibility tree snapshot |
| 8 | `coverage` | No | Omission manifest - what was dropped and why |
| 9 | `network` | No | Network request state at capture time |
| 10 | `console` | No | Captured console errors/warnings |
| 11 | `breakpoints` | No | Active CSS media query breakpoints |

### 2.2 Why plain keys (not `====SECTION====` markers)

The SiFR v2 format uses decorated keys like `"====METADATA===="`. ViewGraph
deliberately does not. Reasons:

- **Dot access:** `capture.metadata` works; `capture["====METADATA===="]` does not
- **Standard JSON:** No special characters in keys means standard schema
  validation, autocomplete, and tooling work out of the box
- **LLMs parse JSON natively:** Models don't need visual markers to locate
  top-level keys - they already understand JSON structure
- **Zero overhead:** Eliminates ~10 characters of noise per key
- **Greppability is equivalent:** `grep '"metadata"'` works as well as
  `grep "====METADATA===="`

If visual separation is desired when viewing raw captures, producers MAY
insert newlines between top-level sections during pretty-printing. This is
a serialization concern, not a format concern.

Unknown top-level keys MUST be preserved by parsers and ignored if not
understood (forward compatibility).

---

## 3. METADATA Section

Required. Provides capture context.

```json
{
  "metadata": {
    "format": "viewgraph-v2",
    "version": "2.2.0",
    "profile": "readable",
    "timestamp": "2026-04-08T06:08:15.214Z",
    "url": "http://localhost:8040/projects",
    "title": "Projects - AI Video Editor",
    "captureMode": "viewgraph-capture",
    "viewport": { "width": 1696, "height": 799 },
    "coordinateFrame": {
      "unit": "css-px",
      "origin": "document-top-left",
      "scrollOffset": { "x": 0, "y": 150 },
      "precision": "round"
    },
    "devicePixelRatio": 1.13,
    "userAgent": "Mozilla/5.0 ...",
    "screenshot": "viewgraph-localhost-20260408-060815.png",
    "provenance": {
      "geometry": "cdp:DOMSnapshot",
      "accessibility": "cdp:Accessibility",
      "styles": "computed-style",
      "selectors": "heuristic",
      "salience": "heuristic",
      "annotations": "user"
    },
    "stats": {
      "totalNodes": 375,
      "salience": { "high": 42, "med": 186, "low": 147 },
      "inOutput": { "high": 42, "med": 150, "low": 80 },
      "clusters": 12,
      "relations": 34,
      "captureSizeBytes": 98000,
      "sizeLimitBytes": 409600
    },
    "extension": {
      "name": "ViewGraph Capture",
      "version": "0.1.0"
    }
  }
}
```

### 3.1 Field definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `format` | string | Yes | Always `"viewgraph-v2"` |
| `version` | string | Yes | Semver. Current: `"2.2.0"` |
| `profile` | string | Yes | `"readable"` or `"compact"` |
| `timestamp` | string | Yes | ISO 8601 UTC |
| `url` | string | Yes | Page URL at capture time |
| `title` | string | Yes | Document title |
| `captureMode` | string | Yes | One of: `screenshot`, `viewgraph-capture`, `select-element`, `review` |
| `viewport` | object | Yes | `{ width, height }` in CSS pixels |
| `coordinateFrame` | object | Yes | Declares bbox coordinate system (see 3.2) |
| `devicePixelRatio` | number | Yes | `window.devicePixelRatio` |
| `screenshot` | string | No | Filename of associated PNG screenshot |
| `provenance` | object | Yes | Per-section data source map (see 3.3) |
| `stats` | object | Yes | Capture statistics |
| `extension` | object | No | Producing extension metadata |

### 3.2 Coordinate frame

All bounding boxes in the capture use the coordinate frame declared here.

| Field | Values | Description |
|---|---|---|
| `unit` | `"css-px"`, `"device-px"` | Coordinate unit |
| `origin` | `"document-top-left"` (canonical), `"viewport-top-left"` | Origin point |
| `scrollOffset` | `{ x, y }` | Document scroll position at capture time |
| `precision` | `"round"`, `"floor"`, `"exact"` | Rounding policy for sub-pixel values |

**Document-relative coordinates are canonical.** This means a node's bbox
does not change when the page is scrolled. Viewport-relative coordinates
can be derived: `viewportX = documentX - scrollOffset.x`.

### 3.3 Provenance map

Provenance is per-section, not global. Each key declares the source of
truth for that data category.

| Key | Example values | Meaning |
|---|---|---|
| `geometry` | `"cdp:DOMSnapshot"`, `"getBoundingClientRect"` | Source of bbox data |
| `accessibility` | `"cdp:Accessibility"`, `"dom-aria-attributes"` | Source of AX data |
| `styles` | `"computed-style"`, `"cdp:CSS"` | Source of style data |
| `selectors` | `"heuristic"`, `"data-testid"` | How selectors were generated |
| `salience` | `"heuristic"` | How salience was scored |
| `annotations` | `"user"` | Always user-provided |

---

## 4. SUMMARY Section

Required. Compact page overview for LLM orientation. An LLM should be able
to understand the page from SUMMARY alone without reading other sections.

```json
{
  "summary": {
    "page": {
      "title": "Projects - AI Video Editor",
      "url": "http://localhost:8040/projects",
      "viewport": { "width": 1696, "height": 799 },
      "totalNodes": 375,
      "salienceCounts": { "high": 42, "med": 186, "low": 147 }
    },
    "styles": {
      "primaryBackgroundColor": "#1e1e2e",
      "primaryTextColor": "#cdd6f4",
      "primaryFontFamily": "Inter, sans-serif",
      "fontSizesPx": [12, 14, 16, 20, 24],
      "fontWeights": [400, 500, 600, 700]
    },
    "layout": {
      "pageWidth": 1696,
      "pageHeight": 2400,
      "mainContentBBox": [200, 60, 1296, 2000],
      "clusters": {
        "spatial": [
          {
            "id": "cluster001",
            "role": "header",
            "elements": ["nav:main-menu", "button:user-profile"]
          }
        ],
        "structural": [
          {
            "id": "pattern001",
            "fingerprint": { "tag": "div", "classes": "project-card" },
            "count": 12,
            "exemplar": {
              "id": "div:project-card-1",
              "children": ["h3", "span.status", "div.actions"]
            }
          }
        ]
      }
    },
    "elements": [
      {
        "nid": 1,
        "alias": "button:create-project",
        "tag": "button",
        "actions": ["clickable"],
        "visibleText": "Create Project",
        "bbox": [1500, 20, 150, 36]
      }
    ]
  }
}
```

### 4.1 Bounding box format

All bounding boxes use the compact array format `[x, y, width, height]`
instead of `{ x, y, width, height }`. This saves ~40% tokens per bbox
(eliminates 4 key strings). Coordinates use the frame declared in
`metadata.coordinateFrame`.

---

## 5. NODES Section

Required. The element tree grouped by salience tier.

### 5.1 Node identity: three-layer ID model

Each node has three identity layers:

| Layer | Field | Purpose | Stability |
|---|---|---|---|
| Machine ID | `nid` | Compact capture-local integer. Primary join key. | Stable within capture |
| Human alias | `alias` | Semantic ID like `button:create-project` | May drift across captures |
| Browser ID | `backendNodeId` | CDP `DOM.BackendNodeId` when available | Stable within browser session |

The `nid` is the canonical reference used in relations, annotations, details,
and accessibility cross-references. The `alias` is for human readability in
prompts and logs. The `backendNodeId` enables round-trip to CDP for live
interaction.

Alias generation priority:

| Priority | Source | Example alias |
|---|---|---|
| 1 | `data-testid` attribute | `button:submit-form` |
| 2 | `id` attribute | `div:main-content` |
| 3 | Accessible name + role | `button:create-project` |
| 4 | Tag + nid | `div:n042` |

### 5.2 Node structure

```json
{
  "nodes": {
    "high": {
      "button": {
        "1": {
          "alias": "button:create-project",
          "backendNodeId": 142,
          "parent": 5,
          "children": [],
          "actions": ["clickable"],
          "ax": {
            "role": "button",
            "name": "Create Project",
            "states": ["focusable"]
          },
          "frame": null,
          "shadowRoot": null,
          "cluster": "cluster001"
        }
      }
    },
    "med": { ... },
    "low": { ... }
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `alias` | string | Yes | Human-readable semantic ID |
| `backendNodeId` | number | No | CDP BackendNodeId for live interaction |
| `parent` | number\|null | Yes | Parent nid, null for root |
| `children` | number[] | Yes | Child nids (ordered) |
| `actions` | string[] | No | `"clickable"`, `"fillable"`, `"hoverable"` |
| `isRendered` | boolean | No | Whether element is actually visible (ancestor chain check for opacity:0, clip-path, off-screen) |
| `ax` | object | No | Inline accessibility data (see 5.3) |
| `frame` | object | No | Frame boundary info (see 5.4) |
| `shadowRoot` | string | No | `"open"` or `"closed"` if shadow host |
| `cluster` | string | No | Cluster ID from SUMMARY |

### 5.3 Inline accessibility (ax field)

For high and medium salience nodes, computed accessibility data is inlined
directly into the node rather than requiring a cross-section join. This is
the data agents use most often for element identification.

| Field | Type | Description |
|---|---|---|
| `role` | string | Computed ARIA role |
| `name` | string | Computed accessible name |
| `description` | string | Computed accessible description |
| `states` | string[] | `focusable`, `editable`, `required`, `disabled`, `expanded`, `selected`, `checked` |

Low-salience nodes MAY omit `ax`. The full accessibility tree (with
parent-child AX relationships that may differ from DOM) is in the optional
`accessibility` section.

### 5.4 Frame and shadow boundaries

When a node is an iframe host or shadow root, boundary info is preserved:

| Field | Type | Description |
|---|---|---|
| `frame.frameId` | string | CDP frame ID |
| `frame.documentNid` | number | nid of the frame's document root node |
| `frame.url` | string | Frame src URL |
| `shadowRoot` | string | `"open"` or `"closed"` |

This enables agents to know when a selector or action crosses an execution
context boundary.

### 5.5 Salience tiers

| Tier | Criteria | AX data | Style detail in DETAILS |
|---|---|---|---|
| `high` | Interactive, visible, has testid/aria, in viewport | Inlined | Full styles + hints |
| `med` | Has content, semantic role, moderate score | Inlined | Layout + visual styles |
| `low` | Decorative, wrappers, low score | Omitted | Minimal or none |

---

## 6. RELATIONS Section

Required. Semantic relationships between nodes. References use `nid`.

```json
{
  "relations": {
    "semantic": [
      { "source": 7, "target": 12, "type": "labelFor" },
      { "source": 3, "target": 15, "type": "controls" }
    ],
    "groups": [
      {
        "nid": 2,
        "orientation": "horizontal",
        "members": [10, 11, 12]
      }
    ]
  }
}
```

### 6.1 Semantic relations (always included)

| Type | Meaning | Source |
|---|---|---|
| `labelFor` | Label targets an input | `for` attribute, `aria-labelledby` |
| `describedBy` | Description targets an element | `aria-describedby` |
| `controls` | Element controls another | `aria-controls` |
| `owns` | Element owns another | `aria-owns` |

### 6.2 Spatial relations (optional, on-demand)

Spatial relations (`above`, `leftOf`, `overlaps`) are NOT included in the
default capture. They can be computed on demand via MCP tool.

---

## 7. DETAILS Section

Required. Full element details grouped by salience tier and tag.

### 7.1 Text channels

Text is split into distinct channels instead of one overloaded `text` field:

| Field | Source | Description |
|---|---|---|
| `visibleText` | Rendered text visible to user | What you see on screen |
| `domText` | `textContent` from DOM | Raw DOM text (may include hidden text) |
| `formValue` | `input.value`, `textarea.value` | Current form control value |
| `accessibleName` | Computed accessible name | What screen readers announce |
| `accessibleDescription` | Computed accessible description | Extended AT description |

Producers SHOULD populate `visibleText` and `accessibleName` for high/med
nodes. Other channels are populated when they differ from `visibleText`.

### 7.2 Locators (multi-strategy)

Instead of a single `selector` string, each node has a ranked array of
locator strategies:

```json
{
  "locators": [
    { "strategy": "testId", "value": "create-project", "rank": 1 },
    { "strategy": "role", "value": "button", "name": "Create Project", "rank": 2 },
    { "strategy": "css", "value": "button[data-testid='create-project']", "rank": 3 },
    { "strategy": "xpath", "value": "//button[@data-testid='create-project']", "rank": 4 }
  ]
}
```

| Strategy | Description | Stability |
|---|---|---|
| `testId` | `data-testid` attribute value | Highest (developer-maintained) |
| `id` | HTML `id` attribute | High (but may be generated) |
| `role` | ARIA role + accessible name | High (semantic) |
| `css` | CSS selector | Medium (breaks on refactor) |
| `xpath` | XPath expression | Medium (breaks on refactor) |
| `textQuote` | Visible text content match | Low (breaks on copy changes) |

Rank 1 = most stable. Agents SHOULD prefer lower-ranked (more stable)
locators. The `rank` field is producer-assigned based on stability heuristics.

### 7.3 Full detail structure

```json
{
  "details": {
    "high": {
      "button": {
        "1": {
          "locators": [
            { "strategy": "testId", "value": "create-project", "rank": 1 },
            { "strategy": "css", "value": "button[data-testid='create-project']", "rank": 3 }
          ],
          "attributes": {
            "data-testid": "create-project",
            "type": "button"
          },
          "visibleText": "Create Project",
          "accessibleName": "Create Project",
          "layout": {
            "bboxDocument": [1500, 170, 150, 36],
            "bboxViewport": [1500, 20, 150, 36]
          },
          "styles": {
            "layout": { "display": "flex" },
            "visual": { "background": "#6366f1", "color": "#fff" },
            "typography": { "font-size": "14px", "font-weight": "600" },
            "spacing": { "padding": "8px 16px", "border-radius": "6px" }
          },
          "hints": [
            { "type": "high-z-index", "value": 1500, "threshold": 1000 }
          ]
        }
      }
    }
  }
}
```

### 7.4 Progressive style disclosure

| Tier | Styles included | Hints |
|---|---|---|
| `high` | All non-default categories | Yes |
| `med` | layout, visual, typography, spacing only | No |
| `low` | None (bbox only) | No |

### 7.5 Hints (anomaly detection)

High-salience nodes MAY include `hints` - detected anomalies. Each hint
includes the detected `value` and the `threshold` that triggered it.

| Hint type | Threshold | Meaning |
|---|---|---|
| `extreme-aspect` | ratio > 20:1 or 1:20 | Very wide or very tall element |
| `negative-margin` | any negative margin | Element uses negative margins |
| `high-z-index` | z-index > 1000 | Elevated stacking context |
| `partially-offscreen` | bbox extends beyond document | Element extends beyond viewport |
| `scrollable` | overflow: auto/scroll with content overflow | Element has scrollable overflow |
| `nearly-transparent` | opacity < 0.3 | Nearly invisible element |

---

## 8. ANNOTATIONS Section

Optional. Present only in `review` capture mode. Internal model is
W3C Web Annotation-aligned for lossless export.

```json
{
  "annotations": [
    {
      "id": "ann-1",
      "type": "region",
      "motivation": "commenting",
      "body": "Add pagination and make error details collapsible",
      "target": {
        "region": [300, 400, 800, 200],
        "selectedNodes": [14, 15, 16],
        "selector": [
          { "type": "CssSelector", "value": "div.job-config" },
          { "type": "FragmentSelector", "value": "nid=14,15,16" }
        ]
      },
      "createdBy": "user",
      "createdAt": "2026-04-08T07:15:00Z"
    }
  ]
}
```

### 8.1 Annotation fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique annotation ID |
| `type` | string | Yes | `"element"` or `"region"` |
| `motivation` | string | No | W3C motivation: `"commenting"`, `"editing"`, `"highlighting"` |
| `body` | string | Yes | Human-written change request or observation |
| `target` | object | Yes | What the annotation points at (see below) |
| `createdBy` | string | No | `"user"` or agent identifier |
| `createdAt` | string | Yes | ISO 8601 UTC |

### 8.2 Annotation target

| Field | Type | Description |
|---|---|---|
| `region` | number[] | `[x, y, w, h]` for region selections |
| `selectedNodes` | number[] | Node nids referenced by this annotation |
| `selector` | object[] | W3C-compatible selectors for export |

---

## 9. ACCESSIBILITY Section

Optional. Full computed accessibility tree snapshot. For most agent workflows,
the inline `ax` field on high/med nodes (Section 5.3) is sufficient. This
section provides the complete AX tree with parent-child relationships that
may differ from the DOM tree.

```json
{
  "accessibility": {
    "source": "cdp:Accessibility",
    "nodes": [
      {
        "nid": 1,
        "axId": "ax-001",
        "role": "button",
        "name": "Create Project",
        "description": null,
        "value": null,
        "focused": false,
        "ignored": false,
        "states": ["focusable"],
        "axChildren": ["ax-002"],
        "backendNodeId": 142
      }
    ]
  }
}
```

### 9.1 Source values

| Value | Meaning |
|---|---|
| `"cdp:Accessibility"` | From CDP Accessibility domain (high fidelity) |
| `"dom-aria-attributes"` | Inferred from DOM ARIA attributes (no browser API) |

---

## 10. COVERAGE Section

Optional. Explicit omission manifest. When a capture is degraded for budget,
this section declares exactly what was dropped and why, so agents can
distinguish "not on the page" from "dropped for budget".

```json
{
  "coverage": {
    "degradationSteps": [
      "low-details-dropped",
      "med-details-reduced"
    ],
    "tiers": {
      "high": { "nodes": "complete", "details": "complete" },
      "med": { "nodes": "complete", "details": "partial" },
      "low": { "nodes": "complete", "details": "dropped" }
    },
    "omittedNodeCount": 0,
    "childrenTextBubbled": 12
  }
}
```

| Field | Type | Description |
|---|---|---|
| `degradationSteps` | string[] | Which budget steps were applied, in order |
| `tiers` | object | Per-tier coverage status: `"complete"`, `"partial"`, `"dropped"` |
| `omittedNodeCount` | number | How many nodes were dropped entirely |
| `childrenTextBubbled` | number | How many nodes had text bubbled to parent |

When `childrenTextBubbled > 0`, the affected parent nodes in DETAILS will
have a `childrenText` field containing the concatenated text of dropped
children.

---

## 11. NETWORK Section

Optional. Network request state captured from the Performance API at
snapshot time. Helps agents diagnose failed API calls, slow requests,
and missing resources without seeing the page.

Added in v2.2.0 (M12.1).

```json
{
  "network": {
    "requests": [
      {
        "url": "https://api.example.com/v1/pulse",
        "initiatorType": "fetch",
        "duration": 234,
        "transferSize": 1520,
        "startTime": 1200,
        "failed": false
      },
      {
        "url": "https://api.example.com/v1/auth",
        "initiatorType": "fetch",
        "duration": 150,
        "transferSize": 0,
        "startTime": 800,
        "failed": true
      }
    ],
    "summary": {
      "total": 12,
      "failed": 1,
      "byType": { "fetch": 5, "script": 3, "css": 2, "img": 2 }
    }
  }
}
```

### 11.1 Request fields

| Field | Type | Description |
|---|---|---|
| `url` | string | Request URL (truncated to 200 chars for privacy) |
| `initiatorType` | string | Performance API initiator: `fetch`, `xmlhttprequest`, `script`, `css`, `img`, etc. |
| `duration` | number | Request duration in ms (rounded) |
| `transferSize` | number | Bytes transferred over the network |
| `startTime` | number | Start time relative to navigation (ms, rounded) |
| `failed` | boolean | Heuristic: `true` when `transferSize === 0 && duration > 0` |

### 11.2 Summary fields

| Field | Type | Description |
|---|---|---|
| `total` | number | Total resource entries (may exceed `requests` array if capped) |
| `failed` | number | Count of failed requests |
| `byType` | object | Count per `initiatorType` |

### 11.3 Limits

- Requests array capped at 100 entries (most recent first by `startTime`)
- URLs truncated to 200 characters
- Request/response bodies are never captured

### 11.4 Data source

Uses `performance.getEntriesByType('resource')` which is available in all
modern browsers without special permissions. Does not expose HTTP status
codes directly - the `failed` flag is a heuristic based on transfer size.

---

## 12. CONSOLE Section

Optional. Captured browser console errors and warnings. Helps agents
correlate UI state with runtime errors (e.g., missing providers,
failed imports, uncaught exceptions).

Added in v2.2.0 (M12.2).

```json
{
  "console": {
    "errors": [
      {
        "message": "No QueryClient set, use QueryClientProvider to set one",
        "stack": "at App.tsx:12\n    at renderWithHooks ...",
        "timestamp": "2026-04-10T15:30:00.123Z"
      }
    ],
    "warnings": [
      {
        "message": "Deprecated prop 'size' on Button component",
        "stack": null,
        "timestamp": "2026-04-10T15:30:01.456Z"
      }
    ],
    "summary": {
      "errors": 1,
      "warnings": 1
    }
  }
}
```

### 12.1 Entry fields

| Field | Type | Description |
|---|---|---|
| `message` | string | Console message text (truncated to 500 chars) |
| `stack` | string\|null | Stack trace when the argument is an Error object |
| `timestamp` | string | ISO 8601 UTC when the message was logged |

### 12.2 Summary fields

| Field | Type | Description |
|---|---|---|
| `errors` | number | Total `console.error` calls (may exceed array if capped) |
| `warnings` | number | Total `console.warn` calls (may exceed array if capped) |

### 12.3 Limits

- 50 entries per level (errors, warnings)
- Messages truncated to 500 characters
- Only `error` and `warn` levels captured (not `log`, `info`, `debug`)

### 12.4 Collection method

The extension installs interceptors on `console.error` and `console.warn`
early in the content script lifecycle. Original console behavior is
preserved (interceptors call through to the originals). The interceptor
captures Error objects with their stack traces when available.

---

## 13. BREAKPOINTS Section

Optional. Active CSS media query breakpoints at capture time. Helps agents
debug responsive layout issues by knowing exactly which breakpoints are
active, not just the viewport width.

Added in v2.2.0 (M12.6).

```json
{
  "breakpoints": {
    "viewport": { "width": 768 },
    "breakpoints": [
      { "name": "xs", "px": 0, "minWidth": true, "maxWidth": false },
      { "name": "sm", "px": 576, "minWidth": true, "maxWidth": false },
      { "name": "md", "px": 768, "minWidth": true, "maxWidth": true },
      { "name": "lg", "px": 992, "minWidth": false, "maxWidth": true },
      { "name": "xl", "px": 1200, "minWidth": false, "maxWidth": true },
      { "name": "2xl", "px": 1400, "minWidth": false, "maxWidth": true }
    ],
    "activeRange": "md"
  }
}
```

### 13.1 Fields

| Field | Type | Description |
|---|---|---|
| `viewport.width` | number | `window.innerWidth` at capture time |
| `breakpoints` | array | Standard breakpoints with match status |
| `breakpoints[].name` | string | Breakpoint name (xs, sm, md, lg, xl, 2xl) |
| `breakpoints[].px` | number | Breakpoint threshold in CSS pixels |
| `breakpoints[].minWidth` | boolean | `window.matchMedia('(min-width: Npx)')` result |
| `breakpoints[].maxWidth` | boolean | `window.matchMedia('(max-width: Npx)')` result |
| `activeRange` | string | Highest min-width breakpoint that matches |

### 13.2 Breakpoint values

Uses Bootstrap/Tailwind conventions: xs(0), sm(576), md(768), lg(992),
xl(1200), 2xl(1400).

---

## 14. Size Budget and Progressive Degradation

### 14.1 Target size

Default target: **400KB** (~100K tokens). Configurable via extension settings.

### 14.2 Degradation strategy

When a capture exceeds the target size, the producer degrades progressively:

1. Drop low-salience DETAILS entirely
2. Reduce med-salience DETAILS to layout + visual only
3. Drop structural pattern instances (keep exemplars)
4. Reduce high-salience DETAILS to layout + visual only
5. Drop low-salience NODES entirely
6. Bubble text content to parent nodes before dropping children

At each step, the `coverage` section is updated to reflect what was retained.

---

## 15. Versioning and Compatibility

### 15.1 Version field

`metadata.version` uses semver (MAJOR.MINOR.PATCH):
- **MAJOR:** Breaking changes to section structure or required fields
- **MINOR:** New optional sections or fields
- **PATCH:** Bug fixes, clarifications

### 15.2 Compatibility rules

- Parsers MUST check `metadata.format === "viewgraph-v2"`
- Parsers SHOULD check `metadata.version` for feature support
- Parsers MUST ignore unknown sections (forward compatibility)
- Parsers MUST ignore unknown fields within known sections
- Producers MUST NOT omit required sections

---

## 16. Standard Format Exports

ViewGraph v2 is the canonical format. Standard format exports are available
as optional MCP tools and optional extension output.

| Export | MCP Tool | Format |
|---|---|---|
| CDP DOMSnapshot | `export_cdp_snapshot` | Columnar arrays + string table |
| Accessibility Tree | `export_ax_tree` | Role/name/state tree |
| W3C Web Annotation | `export_annotations_w3c` | JSON-LD with selectors |

---

## 17. File Naming Convention

```
viewgraph-{hostname}-{YYYYMMDD}-{HHmmss}.viewgraph.json
viewgraph-{hostname}-{YYYYMMDD}-{HHmmss}.png
```

Screenshot PNG uses the same basename as the JSON file.

---

## 18. References

This specification was informed by the research documented in
[viewgraph-format-research.md](./viewgraph-format-research.md). Key sources:

- **Format lineage:** Element to LLM v2.8.1 SiFR format (Insitu, BSL 1.1)
- **JSON Schema 2020-12:** [json-schema.org](https://json-schema.org/draft/2020-12)
- **JSON Pointer (RFC 6901):** [IETF](https://datatracker.ietf.org/doc/html/rfc6901)
- **CDP DOMSnapshot:** [chromedevtools.github.io](https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot)
- **CDP Accessibility:** [chromedevtools.github.io](https://chromedevtools.github.io/devtools-protocol/tot/Accessibility)
- **W3C Web Annotation Data Model:** [w3.org](https://www.w3.org/TR/annotation-model/)
- **Token efficiency research:** (refs 5-13 in format research doc)
- **Browser agent research:** (ref 14 in format research doc)
