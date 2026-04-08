# Output Formats for Full-Fidelity Page Layout Understanding by Agentic Coding Agents

## Executive summary

A developer-focused “super assistant” that understands page layouts in full detail cannot rely on any single representation format. The reason is structural: the formats that are best at *visual truth* (screenshots, raster diffs) usually lack *semantic truth* (roles, labels, relationships), while the formats that excel at *semantic truth* (DOM trees, accessibility trees) often omit the *rendered truth* (exact pixels, clipping, transforms, z-order, and cross-platform parity). A robust setup therefore needs a **bundle of complementary artifacts per capture** plus a **unified schema** for cross-referencing everything via stable IDs and coordinate frames. This is consistent with how modern browser automation exposes distinct viewpoints: DOM, layout/box snapshots, and accessibility trees are separate APIs, each optimized for different use cases. citeturn0search0turn1search0turn20search1turn0search1

For web pages, the most “complete” machine-ingestable foundation today is **(a) DOM structure plus semantics**, **(b) computed layout geometry and paint ordering**, and **(c) accessibility tree naming and role exposure**, all grounded to **one or more screenshots**. Standards and official tooling align with this split: DOM and events are standardized, box generation and stacking contexts define how rendering happens, and the ARIA and accessibility mapping specs describe semantics exposure to assistive technologies. citeturn1search0turn1search17turn20search0turn0search2turn8search3turn21search0

For native mobile screens, parity comes from capturing both **view hierarchy** and **accessibility hierarchy** (they can diverge), plus screenshots. Android’s official documentation explicitly notes that an accessibility tree may not map one-to-one to the view hierarchy, because custom views may expose a virtual accessibility subtree. iOS automation similarly depends heavily on accessibility identifiers, labels, and frames exposed through accessibility APIs and UI testing frameworks. citeturn4search1turn4search2turn4search6turn3search22turn10search0

Your current SIFR v2 approach already contains several critical ingredients (salience, clusters, selectors, computed styles, bounding boxes). The provided sample capture includes explicit metadata (viewport, devicePixelRatio, user agent), hierarchical nodes grouped by salience, spatial clusters with bounding boxes, inter-element relations, and detailed per-node selectors and attributes such as ARIA and test IDs. fileciteturn0file0 fileciteturn0file1  
The biggest step-change to make it “agentic-ready” is to add: **authoritative screenshot grounding**, **accessibility-tree capture and DOM-to-AX mapping**, **incremental diff streams**, and **a security and provenance envelope**.

## Survey of page-layout representation formats

The ecosystem breaks into nine high-value families. Each family tends to be strong in a few dimensions and weak elsewhere, which is why a combined bundle is the practical end state.

### Comparative matrix of major formats

Legend: ✔ strong, ◐ partial/conditional, ✖ weak or not native to format.

| Format family (examples) | Expressiveness (structure, semantics, style, interactions) | Machine-readable | Spatial coords + transforms | Z-order + layers | Text extraction fidelity | Accessibility metadata | Event, action mapping | Versioning + diffs | Tooling ecosystem | Perf + size profile | Licensing, access | Typical use cases |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Web source model (HTML, DOM, CSSOM) | Structure ✔, semantics ◐, style ◐, interactions ✔ | ✔ | ◐ (needs computed geometry) | ◐ (stacking contexts via CSS) | ✔ | ◐ (ARIA in-source, but computed names need algorithm) | ✔ (DOM + UI Events) | ◐ (DOM diffs doable, but no standard patch) | ✔ | Medium | Open standards | Auditing, test selectors, code navigation |
| Web rendered snapshot (CDP DOMSnapshot, CSSOM View boxes) | Structure ✔, semantics ◐, style ✔, interactions ◐ | ✔ | ✔ (bounding boxes; viewport relative) | ◐ (needs explicit paint order capture) | ✔ | ◐ (separate API for AX) | ◐ | ✔ (snapshots diff well) | ✔ | Large (can be huge DOMs) | Protocol docs open | Pixel-grounded layout reasoning, visual regression scaffolding |
| Web accessibility tree (AXTree, ARIA, AAM mappings) | Structure ✔, semantics ✔, style ✖, interactions ◐ | ✔ | ◐ (bounds not always guaranteed) | ✖ | ◐ (name/description computed; text order varies) | ✔ | ◐ (actions exposed via accessibility APIs) | ◐ | ✔ | Medium | Open standards + platform APIs | A11y audit, robust element naming, automation anchors |
| Document format (PDF 2.0, tagged PDF, PDF UA) | Structure ◐, semantics ◐ to ✔ (tagged), style ✔ (print fidelity), interactions ◐ | ✔ | ✔ (page coordinates) | ✔ (OCGs/layers) | ◐ (depends on tagging and Unicode mapping) | ◐ to ✔ (PDF/UA) | ◐ (forms, links) | ✔ (incremental updates exist; diffs nontrivial) | ✔ | Medium to Large | ISO based; some paywalled but widely implemented | Document viewing, extraction, accessibility compliance, archiving |
| Vector graphics (SVG) | Structure ✔, semantics ◐, style ✔, interactions ◐ | ✔ | ✔ | ✔ (document order, stacking contexts, optional z-index drafts) | ◐ (text may be text or paths) | ◐ | ◐ | ✔ (XML diffs) | ✔ | Small to Medium | Open standards | Diagrams, icons, overlays, region selectors |
| Design tool exports (Figma, Sketch, Adobe XD) | Structure ✔, semantics ◐, style ✔, interactions ◐ (prototypes) | ✔ | ✔ | ✔ (layer order) | ✔ (explicit text nodes) | ◐ | ◐ | ✔ (revision history varies) | ✔ | Medium to Large | Vendor APIs; access controlled | Design-to-code, component mapping, design audits |
| Declarative app UI schemas (Unity UXML/USS, JSON Forms UISchema, Adaptive Cards) | Structure ✔, semantics ◐, style ◐, interactions ◐ | ✔ | ◐ (layout rules often not baked to absolute coords) | ◐ | ✔ (text is first-class) | ◐ | ◐ | ✔ | ✔ | Small | Mixed (open specs + product ecosystems) | Portable UI definitions, schema-driven UIs |
| Native runtime hierarchies (Android View tree, iOS UIView tree, React Virtual DOM) | Structure ✔, semantics ◐, style ◐, interactions ✔ | ◐ (needs platform APIs) | ◐ to ✔ (frame/bounds available) | ◐ | ✔ | ◐ to ✔ | ✔ | ◐ | ✔ | Medium | Platform governed | Debugging, testing, instrumentation |
| Annotation formats (World Wide Web Consortium Web Annotation, IIIF, COCO, LabelMe) | Structure ◐, semantics ✔, style ✖, interactions ✖ | ✔ | ✔ (regions, selectors, polygons) | ◐ (layering by convention) | ✖ | ✖ | ✖ | ✔ | ✔ | Small to Medium | Mostly open (datasets vary) | Screenshot-to-element mapping, labeled UI datasets, review workflows |

Primary references for the dominant mechanisms above: DOM model and UI event semantics for web interaction, CSS box model and stacking contexts for geometry and paint order, CDP snapshot and accessibility APIs for capture, accessible name and mapping specs for computed semantics, PDF 2.0 and tagged PDF and PDF/UA for structured documents, SVG rendering order for z-axis paint rules, and vendor docs for design exports. citeturn1search0turn20search2turn1search17turn20search0turn0search0turn0search1turn21search0turn1search2turn17search1turn1search3turn2search2turn2search0turn2search3

### Key format-specific observations that matter for agents

**Web DOM and events are the “source of truth” for structure and interaction hooks, but not for pixels.** The DOM standard defines node trees and the event model, and UI Events extend the DOM event object set for keyboard and mouse interactions. However, answering “where is this on the screen?” requires computed geometry (for example, bounding boxes) and paint order rules. citeturn1search0turn20search2turn20search1

**Computed layout geometry is defined by CSS box generation and formatting rules.** CSS 2.x documents specify that elements generate boxes according to the box model and are laid out under the visual formatting model. Bounding box APIs are standardized in the CSSOM View module, which defines algorithms behind `getBoundingClientRect`. For agents, these are the coordinates that actually ground selectors to pixels. citeturn1search1turn1search17turn20search1

**Z-order and layering for web require stacking-context reasoning.** The CSS 2 spec includes an explicit stacking context description that governs how overlapping content is painted. An agent needs either the derived paint order per element or enough computed properties to reconstruct it reliably. citeturn20search0turn20search3

**Accessibility trees are parallel realities, not just “DOM with roles.”** ARIA defines roles, states, and properties for accessible UI semantics, while mapping specs such as Core-AAM and HTML-AAM define how semantics are exposed to platform accessibility APIs. Accessible name computation is specified separately, because a node’s user-facing name is not always its DOM text. This matters because many automation strategies and “human-like” agents rely on accessible names and roles, not brittle selectors. citeturn0search2turn8search3turn21search1turn21search0

**PDF is visually reliable but semantically conditional.** PDF 2.0 is designed for environment-independent document representation. For structured understanding, tagged PDF defines accessibility mechanisms via structure elements and a structure tree; PDF/UA constrains tagged PDF usage so content is accessible, including requirements around Unicode mapping and logical reading order. When PDFs are scanned, OCR text must be associated and correctly tagged to achieve PDF/UA-quality extraction. citeturn1search2turn1search10turn17search1turn17search5

**SVG is excellent for geometry and overlays but incomplete for app semantics.** SVG 2 defines rendering order along a z-axis and stacking context behavior, making it strong for region overlays and hit-testing. But it does not natively encode high-level UI semantics or “what this control does” without additional metadata conventions. citeturn1search3turn1search19turn0search3

**Design exports (Figma, Sketch, Adobe XD) are geometry-rich and component-aware.** Sketch documents are a ZIP of JSON files plus assets, making it a strong design-time interchange format. Sketch’s CLI can output a layer hierarchy with dimensions and positions. Adobe XD’s plugin scenegraph represents documents as a hierarchical tree, and node bounds can include all visible pixels via global draw bounds. Within Figma’s plugin model, child order is explicitly back-to-front, providing z-order semantics. citeturn2search2turn2search14turn2search7turn2search3turn2search20turn2search0

**Native “view hierarchies” and “accessibility hierarchies” diverge in practice.** Android’s Layout Inspector exposes a view hierarchy for runtime inspection, but the accessibility API describes a potentially different tree. This is why mobile UI automation often captures both an accessibility-sourced XML hierarchy and a screenshot. On iOS, a UIView has a frame and bounds in coordinate space, but test automation frequently hinges on accessibility identifiers. citeturn4search3turn4search1turn4search2turn10search0

**Annotation standards are the glue for screenshot grounding.** The Web Annotation Data Model supports selecting segments of resources using selectors, including SVG-based selectors for geometric regions. IIIF’s Presentation API explicitly moved from Open Annotation to the W3C Web Annotation model, which is a strong signal that Web Annotation is the modern interoperable choice for image-region annotations and provenance in this space. COCO and LabelMe provide widely-used conventions for bounding boxes, segmentations, and polygon annotations in computer vision datasets. citeturn0search3turn7search4turn7search0turn7search2turn7search3

**How SIFR fits in this landscape.** Your SIFR v2 output is effectively a hybrid between a DOM-derived layout snapshot and a test-oriented element map: it stores metadata, a salience-filtered node tree, spatial clusters, relations, and detailed selectors plus attributes and computed styles. This is precisely the shape that helps agents conserve context while still having precise selectors and geometry. fileciteturn0file0 fileciteturn0file1

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Chrome DevTools accessibility tree panel screenshot","Chrome DevTools Elements panel DOM inspector screenshot","Android Studio Layout Inspector view hierarchy screenshot","Xcode view debugger hierarchy screenshot"],"num_per_query":1}

## Agentic coding agents’ input requirements

Agentic coding agents differ from “summarize this JSON” style LLM usage in one brutal way: they must *act*, see consequences, recover from ambiguity, and do so under context and safety constraints. Research and benchmarks on tool-using agents emphasize that coupling reasoning with actions and environment feedback improves reliability, and web-agent benchmarks show that even strong models struggle without better grounding and environment interfaces. citeturn12search0turn12search1turn12search2turn12search7

### Parsing requirements and preferred internal structures

Agents consistently do better with **typed graphs** than with raw blobs. For UI, that means:

A **tree** for containment plus **edges** for non-tree relations (label-for, described-by, control-to-menu, table row groupings, overlap relationships). This is aligned with how DOM is a tree with separate event flow semantics, and how accessibility APIs define roles, relations, and actions across a tree. citeturn1search0turn20search2turn8search3turn4search1

A **canonical coordinate frame** plus explicit conversions: CSS pixel coordinates (viewport-relative), scrolling offsets, and device pixel ratio for web; screen coordinates and bounds for mobile. Standard APIs describe bounding boxes relative to the viewport and require clear definition of what “bounding box” means. citeturn20search1turn0search0turn4search6turn4search1

A **stable identifier strategy**: internal node IDs (for cross-file joins), plus one or more stable selectors (data-testid, accessibilityIdentifier, resource-id). Your current SIFR v2 already stores test IDs and ARIA attributes within element details. fileciteturn0file0 citeturn4search2turn4search1

### Tokenization, size limits, and incremental updates

In practice, complete UI trees are large enough to blow past real-world context windows, and engineers are already asking for subtree extraction specifically to avoid “time and tokens” waste when dealing with accessibility trees. This is not hypothetical; it appears in real tooling discussions around returning partial accessibility subtrees. citeturn13search13turn21search10

Therefore, agent-friendly inputs need:

**Progressive disclosure**: a small summary first (above-the-fold, salient nodes, key clusters), then tool calls to fetch subtrees or details on demand. This aligns with SIFR’s salience model and clustering strategy. fileciteturn0file1

**Patchable updates**: JSON Patch provides a standardized patch document format for updating JSON documents, and JSON Merge Patch provides a simpler “merge-like” alternative. For streaming binary representations, CBOR sequences are designed to concatenate independent CBOR items for streaming. citeturn5search3turn18search3turn18search2

### Grounding to screenshots and multimodal alignment

A screenshot gives pixel truth, but it is useless to an agent unless you also provide **a mapping from pixels back to actionable elements**. The Web Annotation model’s selectors (including SVG selectors) supply an interoperable way to describe regions of an image resource, and IIIF has standardized around this for image-centric annotation exchange. For datasets and training or evaluation workflows, COCO and LabelMe demonstrate widely-used conventions for boxes and polygons on images. citeturn0search3turn7search4turn7search2turn7search3

Multimodal web agents explicitly rely on the combination of screenshots and structured environment signals to close the gap with text-only agents. WebVoyager, for example, frames the problem as completing web instructions end-to-end by interacting with real-world websites using multimodal models. citeturn12search3turn12search7

### Confidence, uncertainty, and provenance

Agents need to know which facts are authoritative and which are inferred. Provenance standards define how to represent information about entities, activities, and agents involved in producing a piece of data, supporting trust and quality assessment. This maps directly to “was this text extracted from DOM, OCR, or inferred?” and “which tool version captured this layout?” citeturn19search1turn19search0

A practical confidence model for UI capture typically tags fields with one of:

* **Measured** (browser or OS API reports, high confidence)
* **Derived** (computed from measured fields, medium-high)
* **Inferred** (ML/OCR or heuristics, variable)
* **User-provided** (test IDs, design-system mapping, high but only if maintained)

The standards and APIs above do not force this labeling, but they provide the foundation for tracking the capture method and semantics exposure mechanisms. citeturn19search1turn0search0turn4search1turn15search1

### Security and sandboxing requirements

Capturing layouts often implies running automation or instrumentation that can touch sensitive data (tokens in HAR files, PII in screenshots, secrets in DOM attributes). Web security specs such as Content Security Policy and Subresource Integrity exist to constrain resource execution and verify resource integrity, and provenance metadata can explicitly record redaction steps and capture context. For automation system design, a common pattern is to isolate capture processes and treat outputs as potentially sensitive artifacts requiring policy and redaction. citeturn19search3turn19search2turn19search1

As a blunt statement: if you ship only screenshots, your agent is basically coding UI with oven mitts on. Funny once. Painful forever.

## Recommended combined output schema and minimal artifact set

### Design goal

The recommended output is a **capture bundle** that is:

Cross-platform (web, Android, iOS), because your target explicitly spans all three.

Grounded (every actionable node can be tied to pixels).

Diffable (you can stream changes without resending the world).

Auditable (explicit provenance and safety posture).

The most future-proof approach is to define a **platform-neutral Core UI Graph** and attach **platform-specific raw captures** as evidence. This mirrors how platform specs separate concepts: structure trees and event models, visual formatting and stacking rules, and accessibility semantics and mappings. citeturn1search0turn1search17turn20search0turn8search3turn21search0

### Proposed combined schema: Unified Layout Capture Bundle

Name it whatever you like. Here is a concrete, implementable conceptual model:

**A. Manifest and provenance envelope**
- Capture metadata: URL or app screen identifier, timestamp, viewport/screen size, devicePixelRatio, locale, and tool versions, similar to what SIFR already stores. fileciteturn0file0
- Provenance chain: capture tool, transformation steps, redactions, diff base IDs, consistent with W3C provenance concepts. citeturn19search1turn19search0

**B. Evidence artifacts**
- Screenshot(s): viewport screenshot and optional full-page or scroll-stitch for web; device screenshot for mobile.
- Raw structural capture:
  - Web: DOM snapshot plus computed layout info from CDP snapshot APIs. citeturn0search0
  - Android: UI hierarchy dump XML (bounds, ids, content-desc), plus accessibility tree if captured separately. citeturn4search21turn4search1
  - iOS: XCUIElement-derived hierarchy and frames, plus accessibility identifiers and labels. citeturn3search22turn4search2turn4search6
- Accessibility tree:
  - Web: AXTree snapshot via CDP Accessibility domain or Puppeteer snapshot. citeturn0search1turn13search2turn21search3

**C. Core UI Graph (normalized)**
- Nodes: one per meaningful UI element, with:
  - stable `uid`
  - `role` and `name` (prefer accessibility-derived naming where possible)
  - `bbox` in a declared coordinate frame
  - `z` ordering hints
  - selectors/locators and a ranking
  - available actions (click, input, scroll)
  - text content (DOM text and/or OCR fallback)
- Edges:
  - containment
  - label relations
  - table relations
  - overlaps
  - “mappedToScreenshotRegion” bindings

**D. Deltas and diffs**
- Structural diffs: JSON Patch or Merge Patch for JSON payloads. citeturn5search3turn18search3
- Visual diffs: pixel diffs for screenshots (pixelmatch) and optional perceptual metrics (SSIM, LPIPS). citeturn15search0turn14search5turn14search10
- Layout stability metrics: CLS-style layout shift signals for web changes. citeturn14search0

### Minimal viable artifact set per page/screen

This is the smallest set that still supports strong agentic behaviors: robust selection, visual grounding, accessibility auditing, and test generation.

| Artifact | Why the agent needs it | Web capture approach | Android capture approach | iOS capture approach |
|---|---|---|---|---|
| Viewport screenshot PNG | Pixel truth, debugging, visual diffing | CDP screenshot or automation screenshot | device screenshot (instrumentation) | device screenshot (instrumentation) |
| Normalized Core UI Graph JSON | One cross-platform query surface | build from DOM + layout + AX | build from hierarchy XML + a11y | build from XCUIElement + a11y |
| Full DOM or subtree serialization | Precise selectors, attributes, text | DOM snapshot API | N/A | N/A |
| Computed box model and bounding boxes | Screen grounding, hit targets | CSSOM View bounding boxes or DOMSnapshot layout | bounds from hierarchy dump | element frames and accessibilityFrame |
| Accessibility tree snapshot | Roles, names, a11y checks, robust naming | CDP Accessibility domain or Puppeteer snapshot | AccessibilityNodeInfo tree | accessibility hierarchy via test APIs |
| Screenshot-to-element mapping | Multimodal alignment, click planning | bind node IDs to bbox regions | bind nodes to bounds | bind nodes to frames |
| Stable test locators report | Reliable test generation | data-testid, role/name selectors | resource-id, content-desc | accessibilityIdentifier |
| Provenance and redaction report | Trust, privacy, auditability | manifest-level | manifest-level | manifest-level |

Rationale sources: web snapshots and accessibility trees are distinct protocol domains; Android hierarchy dumps include bounds and attributes; iOS testing depends on accessibility identifiers and element geometry; accessible naming is specified; and provenance has a dedicated standard model. citeturn0search0turn0search1turn4search21turn4search1turn4search2turn21search0turn19search1

### Optional but high-leverage additions for a “super assistant”

These additions are not “nice to have”; they are what turns the system into something developers will pay for because it saves time repeatedly.

- **Network artifact**: HAR capture for request context, plus replay support. HAR is a widely used format for logging browser HTTP interactions, and modern testing tools can record and route from HAR. citeturn5search2turn13search1turn13search4
- **Interaction trace**: action-by-action screenshots plus DOM snapshots (Playwright trace viewer produces DOM snapshots to inspect state across actions). citeturn13search11turn13search0
- **Accessibility audit results**: integrate an engine like axe-core which returns JSON accessibility violations. citeturn14search3turn14search7
- **Visual regression suite**: pixel diffs plus perceptual diffs and layout-shift alerts. citeturn15search0turn14search5turn14search0
- **Design-system mapping**: link design tokens or components to nodes (Figma components, Sketch symbols, Adobe XD scenegraph nodes) to bridge design-to-code. citeturn2search0turn2search14turn2search3

## Implementation guidance, schemas, and example payloads

### Serialization, compression, and streaming choices

A pragmatic stack that balances developer ergonomics and production performance:

**Human-debuggable canonical storage: JSON (optionally JSON-LD).** JSON-LD is a JSON-based linked-data format intended to integrate into existing JSON systems while enabling interoperable semantics. It pairs well with Web Annotation style selectors and provenance modeling. citeturn6search0turn0search3turn19search0

**Streaming and high-throughput: Protobuf or CBOR (or CBOR sequences).**
- Protobuf is compact and designed for efficient wire encoding; its encoding docs describe the wire format and space concerns. citeturn6search2turn6search6
- CBOR is explicitly designed for small message size and extensibility; CBOR sequences support concatenating multiple CBOR items in a stream. citeturn6search1turn18search2

**Compression: zstd or Brotli depending on your transport.**
- Brotli is standardized as a compressed data format suitable for web use. citeturn6search3turn6search15
- Zstandard is designed for real-time compression scenarios and has an IETF RFC describing its use as a content encoding and media type. citeturn18search1turn18search5

**Deltas: JSON Patch, JSON Merge Patch.**
- JSON Patch (RFC 6902) is the most explicit and operation-based. citeturn5search3
- JSON Merge Patch (RFC 7396) is simpler and “shape-like,” but has limitations with arrays. citeturn18search3

### API surface and retrieval model

Use a tool-driven interface rather than dumping everything into one prompt. Benchmarks and real tooling discussions show that agents benefit from action-feedback loops and from limiting context to relevant subtrees. citeturn12search0turn13search13turn21search10

A minimal capture API design:

- `capture.create(params)` → returns `captureId`
- `capture.getSummary(captureId)` → returns page/screen summary + cluster map
- `capture.getNodes(captureId, filter)` → returns nodes by role/action/text query
- `capture.getSubtree(captureId, rootUid, depth)` → returns bounded subtree
- `capture.getA11y(captureId, rootUid?)` → returns AX subtree
- `capture.getArtifacts(captureId)` → returns artifact manifest (paths/hashes)
- `capture.diff(a, b, mode)` → returns structural patch + optional visual diff metrics

### Mermaid diagrams

```mermaid
flowchart LR
  A[Capture trigger\nextension, headless, device] --> B[Raw capture\nDOM or hierarchy, layout, AX]
  B --> C[Normalize\nCore UI Graph + IDs]
  B --> D[Evidence artifacts\nscreenshots, HAR, trace]
  C --> E[Index\ntext, roles, selectors, embeddings]
  D --> E
  E --> F[Agent tools\nquery, fetch subtree, diff]
  F --> G[Agent actions\nwrite code, tests, fixes]
  G --> H[Re-capture\nvalidate changes]
  H --> C
```

```mermaid
classDiagram
  class CaptureBundle {
    +string captureId
    +Metadata metadata
    +ArtifactManifest artifacts
    +UIGraph uiGraph
    +A11ySnapshot a11y
    +Provenance provenance
    +Delta[] deltas
  }
  class UIGraph {
    +Node[] nodes
    +Edge[] edges
    +Mapping[] mappings
  }
  class Node {
    +string uid
    +string platformType
    +string role
    +string name
    +BBox bbox
    +Action[] actions
    +Selector[] selectors
    +StyleTokens style
    +Confidence confidence
  }
  class Mapping {
    +string uid
    +Region region
    +string screenshotRef
  }
  CaptureBundle --> UIGraph
  UIGraph --> Node
  UIGraph --> Mapping
```

### Sample schema outline

This JSON is intentionally minimal but captures the join points that matter (IDs, coordinate frames, provenance, mapping).

```json
{
  "schema": "ulcb-1.0",
  "captureId": "2026-04-08T06:14:41Z:web:localhost:5173/jobs",
  "metadata": {
    "platform": "web",
    "url": "http://localhost:5173/jobs",
    "timestamp": "2026-04-08T06:14:41.771Z",
    "viewport": { "width": 1696, "height": 799 },
    "devicePixelRatio": 1.1321,
    "tools": [{ "name": "capture-extension", "version": "2.x" }]
  },
  "artifacts": {
    "screenshots": [{ "id": "viewport", "mime": "image/png", "sha256": "..." }],
    "domSnapshot": { "mime": "application/json", "sha256": "..." },
    "a11ySnapshot": { "mime": "application/json", "sha256": "..." },
    "networkHar": null
  },
  "coordinateFrames": [
    { "id": "cssPxViewport", "unit": "css_px", "origin": "viewport_top_left" },
    { "id": "devicePx", "unit": "device_px", "origin": "viewport_top_left" }
  ],
  "uiGraph": {
    "nodes": [
      {
        "uid": "n:btn:talk",
        "platformType": "web.dom",
        "role": "button",
        "name": "Talk",
        "bbox": { "frame": "cssPxViewport", "x": 865, "y": 14, "w": 99, "h": 36 },
        "selectors": [
          { "kind": "css", "value": "button[data-testid='talk']", "rank": 1 }
        ],
        "actions": [{ "kind": "click" }],
        "confidence": { "bbox": 0.99, "name": 0.95, "role": 0.9 },
        "provenance": { "bbox": "computed-layout", "name": "a11y-name-or-text" }
      }
    ],
    "mappings": [
      {
        "uid": "n:btn:talk",
        "screenshotId": "viewport",
        "region": { "kind": "bbox", "x": 865, "y": 14, "w": 99, "h": 36 }
      }
    ]
  }
}
```

### Example payload grounded in your current SIFR v2 structure

Your SIFR v2 already provides: per-page metadata, salience buckets, clusters, element bounding boxes, selectors, attributes like `data-testid`, and ARIA attributes, plus computed styles. In short: it is an excellent “summary-first” representation. fileciteturn0file0 fileciteturn0file1  
To make it a full capture bundle, add artifact references (screenshots, optional HAR, optional AX snapshot) and an explicit node-to-screenshot binding table. The web platform protocols already expose the necessary raw sources: DOMSnapshot for layout and the Accessibility domain for AX trees. citeturn0search0turn0search1turn21search3

### Example payload for a native mobile screen

For Android, a common real-world baseline is “screenshot + hierarchy dump” where the XML contains node attributes including bounds, resource IDs, class names, text, and content descriptions. This is explicitly described in tooling documentation around `uiautomator dump`. citeturn4search21turn4search1

```json
{
  "schema": "ulcb-1.0",
  "captureId": "2026-04-08T06:20:10Z:android:com.example.app:Login",
  "metadata": {
    "platform": "android",
    "appId": "com.example.app",
    "screen": "Login",
    "timestamp": "2026-04-08T06:20:10.112Z",
    "device": { "model": "Pixel-like", "os": "Android" }
  },
  "artifacts": {
    "screenshots": [{ "id": "device", "mime": "image/png", "sha256": "..." }],
    "nativeHierarchy": { "mime": "application/xml", "sha256": "..." },
    "a11ySnapshot": { "mime": "application/json", "sha256": "..." }
  },
  "uiGraph": {
    "nodes": [
      {
        "uid": "a:resourceId:com.example.app:id/login_btn",
        "platformType": "android.view",
        "role": "button",
        "name": "Log in",
        "bbox": { "frame": "devicePx", "x": 120, "y": 1650, "w": 840, "h": 140 },
        "selectors": [
          { "kind": "resource-id", "value": "com.example.app:id/login_btn", "rank": 1 },
          { "kind": "text", "value": "Log in", "rank": 2 }
        ],
        "actions": [{ "kind": "click" }],
        "provenance": { "bbox": "uiautomator-bounds", "name": "accessibility-or-text" }
      }
    ]
  }
}
```

For iOS, the equivalent is “screenshot + XCUIElement tree + accessibility identifiers and labels,” where identifiers are intended for automation and labels for user-facing accessibility. citeturn3search22turn4search2turn4search6

## Tooling and libraries to generate and consume artifacts

### Web capture and layout extraction

- **Headless browser automation and capture**: Puppeteer provides high-level automation over Chrome DevTools Protocol and WebDriver BiDi, and exposes APIs for screenshots and accessibility snapshots. citeturn13search20turn13search5turn13search2
- **Protocol-level layout snapshots**: CDP’s DOMSnapshot domain provides document snapshots with DOM, layout, and style information. citeturn0search0
- **Accessibility capture**: CDP’s Accessibility domain supports retrieving full or partial accessibility trees; enabling it can keep AXNode IDs consistent across calls but may impact performance while enabled. citeturn0search1turn21search3
- **WebDriver and WebDriver BiDi for standardized automation**: WebDriver defines a remote control interface for introspection and control of user agents, and BiDi defines a bidirectional protocol for remote control and events. citeturn5search0turn5search1
- **Network capture**: HAR is a standard-ish de facto format for HTTP archive logs, and Playwright can record and route from HAR for replay. citeturn5search2turn13search1turn13search4
- **Interaction traces**: Playwright trace viewer records and allows inspection of state over time, including DOM snapshots and other debugging signals. citeturn13search11turn13search0

### Mobile capture and hierarchy extraction

- **Android**: Layout Inspector provides runtime view hierarchy inspection; UI Automator tooling can dump a hierarchical XML with bounds and attributes; accessibility APIs expose AccessibilityNodeInfo trees. citeturn4search3turn4search21turn4search1
- **iOS**: UIView geometry is defined via frame and bounds; automation often relies on accessibility identifiers, and UI test frameworks provide XCUIElement abstractions for interaction. citeturn10search0turn4search2turn3search22
- **Cross-platform automation**: Appium’s “Get Page Source” returns HTML in web contexts and application hierarchy XML in native contexts, and the XCUITest driver references accessibility snapshots for page source generation and attribute retrieval. citeturn16search9turn16search5turn15search12

### Design-tool capture and design-to-code mapping

- Sketch file format is a ZIP archive containing JSON encoded data; Sketch CLI inspection can output layer hierarchies with dimensions and positions. citeturn2search2turn2search14
- Adobe XD’s plugin scenegraph is a hierarchical tree, and nodes expose global draw bounds in global coordinate space. citeturn2search7turn2search3
- Figma’s REST API exposes file and node endpoints; in the plugin scene graph, child order is back-to-front, making z-order explicit. citeturn2search0turn2search20

### Visual diffs, OCR, and accessibility audits

- **Pixel diffs**: pixelmatch is a small pixel-level image comparison library created for screenshot diffs. citeturn15search0
- **OCR**: Tesseract provides an OCR engine and command line tool, with modern LSTM-based recognition. citeturn15search1
- **Automated accessibility auditing**: axe-core is an accessibility testing engine that returns JSON results of issues. citeturn14search3turn14search7

### Integration patterns with agentic coding agents

A robust integration pattern is:

Tool-first: the agent queries summaries and targeted subtrees, rather than receiving full captures.

Grounded selection: the agent chooses elements by role and accessible name (more stable) and only falls back to CSS/XPath when necessary, consistent with accessibility naming and mapping specs. citeturn21search0turn21search1turn8search3

Action-feedback loops: the agent should validate assumptions by acting, recapturing, and diffing, aligning with ReAct-style reasoning plus acting and with findings from web agent benchmarks. citeturn12search0turn12search2turn12search7

Retrieval augmentation: index per-node text, roles, selectors, and cluster summaries; then retrieve relevant nodes for a task such as “generate Playwright tests for all buttons lacking data-testid.” Your SIFR MCP Bridge concept already describes MCP tools like listing captures, querying elements by role, and comparing captures. fileciteturn0file1

## Evaluation metrics, trade-offs, and a prioritized roadmap

### Fidelity and usefulness metrics

A “layout understanding” system should be evaluated on both correctness and downstream developer value.

**Structural and semantic fidelity**
- Node coverage: proportion of visible interactive elements in screenshot that are represented in the Core UI Graph.
- Selector stability: test locators remain valid across small UI refactors.
- Accessibility correctness: role/name exposure aligns with ARIA roles, mappings, and name computation expectations. citeturn0search2turn8search3turn21search0

**Geometric and visual fidelity**
- Bounding box alignment: IoU between reported boxes and pixel-derived boxes for key elements.
- Visual similarity: SSIM and LPIPS are widely used similarity metrics; SSIM is classically defined for structural similarity, and LPIPS is designed to correlate with perceptual similarity. citeturn14search5turn14search10turn14search2
- Layout stability: CLS measures unexpected layout shifts over a page lifecycle; for regression systems, CLS-like signals help prioritize meaningful layout changes. citeturn14search0turn14search8

**Agent effectiveness**
- Task success rate on representative developer tasks (generate tests, locate a11y issues, implement UI change).
- Intervention rate: how often a human had to correct the agent’s element grounding.
- Time-to-fix: end-to-end time saved relative to baseline.

Web agent benchmarks provide a reality check that success rates can remain low on realistic tasks without better environment interfaces and grounding, making these metrics necessary, not academic. citeturn12search2turn12search18turn12search7

### Core trade-offs for a developer “super assistant”

**Real-time vs batch**
- Real-time capture and streaming deltas enables interactive debugging but increases compute, storage churn, and privacy exposure.
- Batch capture is cheaper and safer but less helpful for “debug now” workflows.

Streaming protocols and patches enable either mode: JSON Patch and Merge Patch for JSON; CBOR sequences for streaming; compression like zstd or Brotli to control bandwidth. citeturn5search3turn18search2turn18search1turn6search3

**Storage vs compute**
- Keeping full DOM snapshots, AX trees, and high-res screenshots for every step is expensive but enables retroactive debugging.
- A tiered approach helps: store full bundles for key checkpoints, store deltas for intermediate steps, and prune raw artifacts while retaining normalized graphs and summaries.

**Privacy vs usefulness**
- HAR and screenshots are high risk because they can capture tokens, personal data, and internal content.
- Mitigate with strict scoping (allowlists), redaction rules, and explicit provenance records of what was captured and what was scrubbed. Provenance modeling supports auditable capture pipelines, and web security controls like CSP and SRI are relevant reference points for integrity and execution constraints. citeturn19search1turn19search3turn19search2

### Prioritized roadmap

**Phase alpha: Web-first, bundle foundation**
- Implement capture bundle packaging: screenshot + DOMSnapshot + AX snapshot + Core UI Graph.
- Add node mapping: DOM node or internal UID to screenshot regions using bounding boxes and declared coordinate frames.
- Provide tool endpoints for summary, subtree fetch, and “interactive elements missing stable locators.”
- Add diff: JSON Patch between captures and pixelmatch screenshot diffs. citeturn0search0turn0search1turn5search3turn15search0

**Phase beta: Interaction traces and network context**
- Add Playwright-style traces: action timeline with per-step DOM snapshot and screenshot.
- Add HAR capture and optional replay workflows. citeturn13search11turn13search0turn13search1turn5search2

**Phase gamma: Mobile parity**
- Android: unify `uiautomator dump` XML, Layout Inspector-derived properties where available, and AccessibilityNodeInfo-based semantics.
- iOS: unify XCUIElement snapshots and accessibility identifiers with screen geometry. citeturn4search21turn4search3turn4search1turn3search22turn4search2

**Phase delta: Design-to-code and component mapping**
- Ingest design exports and map components to runtime nodes via geometry + text + token matching.
- Exploit design layer ordering and bounds as priors for UI structure. citeturn2search2turn2search3turn2search20

**Phase production: Safety, governance, and evaluation automation**
- Add redaction policies and provenance audit trails per capture.
- Establish continuous evaluation using task suites and layout stability metrics.
- Add enterprise controls for retention and access.

This roadmap aligns with the core empirical lesson from tool-using agent research: agents become more reliable when their actions are grounded in environment feedback, and when they can retrieve targeted context rather than being forced to ingest massive unstructured dumps. citeturn12search0turn12search1turn13search13