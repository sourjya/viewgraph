# ViewGraph v2 Format Specification

**Version:** 2.0.0
**Date:** 2026-04-08
**Status:** Draft
**Authors:** ViewGraph Project

**Lineage:** Inspired by the SiFR v2 format from
[Element to LLM](https://addons.mozilla.org/en-US/firefox/addon/element-to-llm/)
(Insitu). See [viewgraph-format-research.md](./viewgraph-format-research.md)
for credits and analysis.

---

## 1. Overview

ViewGraph v2 is a JSON format for representing captured web page state —
structure, layout, styles, accessibility, and human annotations — optimized
for consumption by LLM-based coding agents via MCP tools.

### 1.1 Design goals

1. **LLM-first:** Minimize tokens for equivalent information. Progressive
   disclosure — summary first, details on demand.
2. **Human-readable:** Full tag names, semantic node IDs, no abbreviations.
3. **Formally specified:** This document is the contract. Producers and
   consumers can be built independently.
4. **Extensible:** New sections can be added without breaking existing parsers.
   Unknown sections MUST be ignored.
5. **Interoperable:** Optional export to standard formats (CDP DOMSnapshot,
   AX tree, W3C Web Annotation) via MCP tools.

### 1.2 MIME type and file extension

- MIME: `application/vnd.viewgraph.v2+json`
- Extension: `.viewgraph.json`
- Legacy extension: `.json` (accepted by parsers)

---

## 2. Top-Level Structure

A ViewGraph v2 capture is a single JSON object with section-marker keys.
Sections are ordered for optimal LLM attention (most important first).

```json
{
  "====METADATA====": { ... },
  "====SUMMARY====":  { ... },
  "====NODES====":    { ... },
  "====RELATIONS====": { ... },
  "====DETAILS====":  { ... },
  "====ANNOTATIONS====": [ ... ]
}
```

### 2.1 Section ordering

Sections MUST appear in this order. Parsers SHOULD NOT depend on order but
producers MUST emit in this order for LLM attention optimization.

| Order | Section | Required | Purpose |
|---|---|---|---|
| 1 | METADATA | Yes | Capture context, viewport, stats, provenance |
| 2 | SUMMARY | Yes | Page overview, styles, clusters, key elements |
| 3 | NODES | Yes | Element tree grouped by salience tier |
| 4 | RELATIONS | Yes | Semantic and structural relationships |
| 5 | DETAILS | Yes | Full selectors, attributes, computed styles |
| 6 | ANNOTATIONS | No | Human annotations from review mode |
| 7 | ACCESSIBILITY | No | Computed accessibility tree snapshot |

### 2.2 Section marker keys

Keys use the pattern `====NAME====`. This convention:
- Makes sections greppable in raw JSON
- Provides visual landmarks for human readers
- Costs ~5 tokens per marker (negligible)

Unknown section keys matching `====*====` MUST be preserved by parsers and
ignored if not understood.

---

## 3. METADATA Section

Required. Provides capture context.

```json
{
  "====METADATA====": {
    "format": "viewgraph-v2",
    "version": "2.0.0",
    "timestamp": "2026-04-08T06:08:15.214Z",
    "url": "http://localhost:8040/projects",
    "title": "Projects - AI Video Editor",
    "captureMode": "viewgraph-capture",
    "viewport": { "width": 1696, "height": 799 },
    "coordinateFrame": {
      "unit": "css-px",
      "origin": "viewport-top-left"
    },
    "documentScroll": { "x": 0, "y": 150 },
    "devicePixelRatio": 1.13,
    "userAgent": "Mozilla/5.0 ...",
    "screenshot": "viewgraph-localhost-2026-04-08T060815.png",
    "provenance": "browser-api",
    "stats": {
      "totalNodes": 375,
      "salience": { "high": 42, "med": 186, "low": 147 },
      "inOutput": { "high": 42, "med": 150, "low": 80 },
      "clusters": 12,
      "relations": 34,
      "captureSize": 98000,
      "sizeLimit": 409600
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
| `version` | string | Yes | Semver. Current: `"2.0.0"` |
| `timestamp` | string | Yes | ISO 8601 UTC |
| `url` | string | Yes | Page URL at capture time |
| `title` | string | Yes | Document title |
| `captureMode` | string | Yes | One of: `screenshot`, `viewgraph-capture`, `select-element`, `review` |
| `viewport` | object | Yes | `{ width, height }` in CSS pixels |
| `coordinateFrame` | object | Yes | Declares bbox coordinate system |
| `documentScroll` | object | Yes | `{ x, y }` scroll offset at capture time |
| `devicePixelRatio` | number | Yes | Window.devicePixelRatio |
| `screenshot` | string | No | Filename of associated PNG screenshot |
| `provenance` | string | Yes | Default data source: `"browser-api"` |
| `stats` | object | Yes | Capture statistics |
| `extension` | object | No | Producing extension metadata |

### 3.2 Coordinate frame

All bounding boxes in the capture use the coordinate frame declared here.

| Field | Values | Description |
|---|---|---|
| `unit` | `"css-px"`, `"device-px"` | Coordinate unit |
| `origin` | `"viewport-top-left"`, `"document-top-left"` | Origin point |

When `origin` is `"viewport-top-left"`, add `documentScroll` to get
document-relative coordinates.

---

## 4. SUMMARY Section

Required. Compact page overview for LLM orientation. An LLM should be able
to understand the page from SUMMARY alone without reading other sections.

```json
{
  "====SUMMARY====": {
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
      "fontWeights": [400, 500, 600, 700],
      "hasAnimations": false
    },
    "layout": {
      "pageWidth": 1696,
      "pageHeight": 2400,
      "mainContentBBox": [200, 60, 1296, 2000],
      "gridSize": "12x12",
      "axis": "rows:top→down, cols:left→right",
      "clusters": {
        "spatial": [
          {
            "id": "cluster001",
            "gridPos": "[0-1, 0-11]",
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
            },
            "salience": "med"
          }
        ]
      }
    },
    "elements": [
      {
        "id": "button:create-project",
        "tag": "button",
        "category": "button",
        "actions": ["clickable"],
        "text": "Create Project",
        "bbox": [1500, 20, 150, 36]
      }
    ]
  }
}
```

### 4.1 Bounding box format

All bounding boxes use the compact array format `[x, y, width, height]`
instead of `{ x, y, width, height }`. This saves ~40% tokens per bbox
(eliminates 4 key strings).

### 4.2 Structural patterns

Structural patterns MUST be self-contained in SUMMARY. Each pattern includes
an inline exemplar showing the structure, so the LLM can understand the
pattern without cross-referencing NODES or DETAILS.

### 4.3 Element summaries

The `elements` array contains high-salience interactive elements with enough
context for the LLM to reference them (id, tag, text, bbox, actions). This
is the "quick reference card" for the page.

---

## 5. NODES Section

Required. The element tree grouped by salience tier.

```json
{
  "====NODES====": {
    "high": {
      "button": {
        "button:create-project": {
          "parent": "div:header-actions",
          "children": [],
          "actions": ["clickable"],
          "cluster": "cluster001",
          "posInCluster": "top-right"
        }
      },
      "nav": {
        "nav:main-menu": {
          "parent": "header:site-header",
          "children": ["a:home", "a:projects", "a:settings"],
          "cluster": "cluster001",
          "posInCluster": "top-left"
        }
      }
    },
    "med": { ... },
    "low": { ... }
  }
}
```

### 5.1 Node ID format

Node IDs follow the pattern `tag:semantic-identifier` where:

| Priority | Source | Example |
|---|---|---|
| 1 | `data-testid` attribute | `button:submit-form` |
| 2 | `id` attribute | `div:main-content` |
| 3 | Accessible name + role | `button:create-project` |
| 4 | Tag + sequential counter | `div:n042` |

IDs MUST be unique within a capture. IDs SHOULD be human-readable.

### 5.2 Node structure

Each node in the NODES section contains structural information only — no
styles, no selectors, no attributes. Those live in DETAILS.

| Field | Type | Required | Description |
|---|---|---|---|
| `parent` | string\|null | Yes | Parent node ID, null for root |
| `children` | string[] | Yes | Child node IDs (ordered) |
| `actions` | string[] | No | `"clickable"`, `"fillable"`, `"hoverable"` |
| `oid` | string | No | Original HTML `id` attribute |
| `cluster` | string | No | Cluster ID from SUMMARY |
| `posInCluster` | string | No | Semantic position: `"top-left"`, `"center"`, etc. |

### 5.3 Salience tiers

| Tier | Criteria | Style detail in DETAILS |
|---|---|---|
| `high` | Interactive, visible, has testid/aria, in viewport | Full styles + hints |
| `med` | Has content, semantic role, moderate score | Layout + visual styles |
| `low` | Decorative, wrappers, low score | Minimal or none |

Salience is computed by the producer using a weighted scoring algorithm.
The spec does not mandate a specific algorithm — only that the three tiers
are populated and that `high` contains the most important interactive elements.

---

## 6. RELATIONS Section

Required. Semantic relationships between nodes.

```json
{
  "====RELATIONS====": {
    "semantic": {
      "label:email-label": { "input:email-field": "labelFor" },
      "button:show-details": { "div:details-panel": "controls" }
    },
    "groups": {
      "nav:main-menu": {
        "orientation": "horizontal",
        "members": ["a:home", "a:projects", "a:settings"]
      }
    }
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

### 6.2 Groups (always included)

Ordered groups of sibling elements (nav items, tab lists, etc.) with
orientation (`horizontal` or `vertical`).

### 6.3 Spatial relations (optional, on-demand)

Spatial relations (`above`, `leftOf`, `overlaps`) are NOT included in the
default capture. They can be computed on demand via the MCP tool
`get_spatial_relations({ filename })`.

**Rationale:** Spatial relations are expensive to compute, produce hundreds
of entries, and are rarely needed by LLM agents. Semantic relations cover
most use cases.

---

## 7. DETAILS Section

Required. Full element details grouped by salience tier and tag.

```json
{
  "====DETAILS====": {
    "high": {
      "button": {
        "button:create-project": {
          "selector": "button[data-testid='create-project']",
          "attributes": {
            "data-testid": "create-project",
            "type": "button"
          },
          "text": "Create Project",
          "layout": {
            "bbox": [1500, 20, 150, 36],
            "scroll": null
          },
          "styles": {
            "layout": { "display": "flex" },
            "visual": { "background": "#6366f1", "color": "#fff" },
            "typography": { "font-size": "14px", "font-weight": "600" },
            "spacing": { "padding": "8px 16px", "border-radius": "6px" }
          },
          "hints": [
            { "type": "high-z-index", "value": 100 }
          ]
        }
      }
    },
    "med": {
      "div": {
        "div:project-card-1": {
          "selector": "div.project-card:nth-child(1)",
          "text": "My Video Project",
          "layout": { "bbox": [200, 100, 400, 200] },
          "styles": {
            "layout": { "display": "flex", "flex-direction": "column" },
            "visual": { "background": "#2a2a3e" }
          }
        }
      }
    },
    "low": {
      "div": {
        "div:n042": {
          "selector": "div.wrapper:nth-child(3)",
          "text": "",
          "layout": { "bbox": [0, 0, 1696, 2400] }
        }
      }
    }
  }
}
```

### 7.1 Progressive style disclosure

| Tier | Styles included | Hints |
|---|---|---|
| `high` | All non-default categories | Yes |
| `med` | layout, visual, typography, spacing only | No |
| `low` | None (bbox only) | No |

### 7.2 Style categories

Styles are grouped by category. Only non-default values are included.
CSS shorthand is used where possible (margin, padding, border, flex,
background, inset, outline, gap).

| Category | Properties |
|---|---|
| `layout` | display, position, float, visibility, overflow, width, height, min/max-width/height |
| `spacing` | margin, padding, border, border-radius |
| `positioning` | top, right, bottom, left, z-index, transform |
| `visual` | color, background, opacity, box-shadow, filter |
| `typography` | font, font-size, font-weight, line-height, text-align, text-decoration |
| `flexbox` | flex-direction, justify-content, align-items, gap |
| `grid` | grid-template-columns, grid-template-rows, grid-area |

### 7.3 Hints (anomaly detection)

High-salience nodes MAY include `hints` — detected anomalies that might
indicate bugs or interesting layout behavior:

| Hint type | Meaning |
|---|---|
| `extreme-aspect` | Very wide or very tall element |
| `negative-margin` | Element uses negative margins |
| `high-z-index` | z-index > 1000 |
| `partially-offscreen` | Element extends beyond viewport |
| `scrollable` | Element has scrollable overflow |
| `nearly-transparent` | Opacity between 0 and 0.3 |

---

## 8. ANNOTATIONS Section

Optional. Present only in `review` capture mode.

```json
{
  "====ANNOTATIONS====": [
    {
      "id": "ann-1",
      "type": "region",
      "region": [300, 400, 800, 200],
      "selectedNodes": ["div:job-config", "table:runs-table"],
      "comment": "Add pagination and make error details collapsible",
      "timestamp": "2026-04-08T07:15:00Z"
    },
    {
      "id": "ann-2",
      "type": "element",
      "selectedNodes": ["button:view-chain"],
      "comment": "Open in side panel instead of navigating away",
      "timestamp": "2026-04-08T07:15:30Z"
    }
  ]
}
```

### 8.1 Annotation fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique annotation ID |
| `type` | string | Yes | `"element"` or `"region"` |
| `region` | number[] | No | `[x, y, w, h]` for region selections |
| `selectedNodes` | string[] | Yes | Node IDs referenced by this annotation |
| `comment` | string | Yes | Human-written change request or observation |
| `timestamp` | string | Yes | ISO 8601 UTC |

### 8.2 Node references

`selectedNodes` contains node IDs that MUST exist in the NODES section.
This allows MCP tools to resolve annotations to full node details.

---

## 9. ACCESSIBILITY Section

Optional. Computed accessibility tree snapshot.

```json
{
  "====ACCESSIBILITY====": {
    "source": "computed",
    "nodes": [
      {
        "nodeId": "button:create-project",
        "role": "button",
        "name": "Create Project",
        "description": null,
        "value": null,
        "focused": false,
        "states": ["focusable"],
        "children": []
      },
      {
        "nodeId": "input:email-field",
        "role": "textbox",
        "name": "Email address",
        "description": "Enter your work email",
        "value": "",
        "focused": true,
        "states": ["focusable", "editable", "required"],
        "children": []
      }
    ]
  }
}
```

### 9.1 AX node fields

| Field | Type | Description |
|---|---|---|
| `nodeId` | string | Matches a node ID in NODES section |
| `role` | string | Computed ARIA role |
| `name` | string | Computed accessible name |
| `description` | string\|null | Computed accessible description |
| `value` | string\|null | Current value (inputs, sliders) |
| `focused` | boolean | Currently focused |
| `states` | string[] | `focusable`, `editable`, `required`, `disabled`, `expanded`, `selected`, `checked` |
| `children` | string[] | Child AX node IDs (may differ from DOM children) |

### 9.2 Source

| Value | Meaning |
|---|---|
| `"computed"` | From browser accessibility APIs (CDP Accessibility domain) |
| `"derived"` | Inferred from DOM ARIA attributes (no browser API access) |

---

## 10. Standard Format Exports

ViewGraph v2 is the canonical format. Standard format exports are available
as optional MCP tools and optional extension output.

| Export | MCP Tool | Extension Setting | Format |
|---|---|---|---|
| CDP DOMSnapshot | `export_cdp_snapshot` | ☐ CDP DOMSnapshot | Columnar arrays + string table |
| Accessibility Tree | `export_ax_tree` | ☐ Accessibility Tree | Role/name/state tree |
| W3C Web Annotation | `export_annotations_w3c` | ☐ W3C Annotations | JSON-LD with selectors |

Exports are derived from the ViewGraph capture — they are views, not
independent captures. The ViewGraph file is always the source of truth.

---

## 11. Size Budget and Progressive Degradation

### 11.1 Target size

Default target: **400KB** (approximately 100K tokens). Configurable via
extension settings.

### 11.2 Degradation strategy

When a capture exceeds the target size, the producer degrades progressively:

1. Downgrade low-salience DETAILS from minimal → drop entirely
2. Downgrade med-salience DETAILS from medium → minimal
3. Drop structural pattern instances (keep exemplars)
4. Downgrade high-salience DETAILS from full → medium
5. Drop low-salience NODES entirely
6. Bubble text content to parent nodes before dropping children

At each step, `stats.inOutput` is updated to reflect what was retained.

### 11.3 Text bubbling

When a node is dropped for budget, its text content is appended to the
nearest retained ancestor's `childrenText` field in DETAILS. This preserves
semantic context without the node overhead.

---

## 12. Versioning and Compatibility

### 12.1 Version field

`METADATA.version` uses semver (MAJOR.MINOR.PATCH):
- **MAJOR:** Breaking changes to section structure or required fields
- **MINOR:** New optional sections or fields
- **PATCH:** Bug fixes, clarifications

### 12.2 Compatibility rules

- Parsers MUST check `METADATA.format === "viewgraph-v2"`
- Parsers SHOULD check `METADATA.version` for feature support
- Parsers MUST ignore unknown sections (forward compatibility)
- Parsers MUST ignore unknown fields within known sections
- Producers MUST NOT omit required sections

---

## 13. File Naming Convention

```
viewgraph-{hostname}-{YYYYMMDD}-{HHmmss}.viewgraph.json
viewgraph-{hostname}-{YYYYMMDD}-{HHmmss}.png
```

Examples:
- `viewgraph-localhost-20260408-060815.viewgraph.json`
- `viewgraph-localhost-20260408-060815.png`

Screenshot PNG uses the same basename as the JSON file.

---

## 14. References

This specification was informed by the research documented in
[viewgraph-format-research.md](./viewgraph-format-research.md). Key sources:

- **Format lineage:** Element to LLM v2.8.1 SiFR format (Insitu, BSL 1.1).
  Section markers, salience tiers, spatial clustering, and budget-based sizing
  are concepts adapted from SiFR. No code was reused.
- **Token efficiency:** Compact bbox arrays, progressive style disclosure, and
  columnar encoding options are informed by LLM context compression research
  [research doc refs 5–13].
- **Accessibility section:** Motivated by browser agent research showing AX tree
  snapshots as primary agent context [research doc ref 14], and CDP Accessibility
  domain [research doc refs 28–31].
- **Annotation export:** W3C Web Annotation Data Model [research doc refs 32–33].
- **Coordinate frame declaration:** Informed by CDP DOMSnapshot's explicit
  coordinate handling [research doc ref 28] and the ULCB schema proposal
  [research doc ref 40].
