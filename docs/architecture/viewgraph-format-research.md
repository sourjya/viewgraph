# ViewGraph Format Research: Analysis, LLM Ingestibility, and Improvement Proposals

**Date:** 2026-04-08

**Status:** Complete

**Purpose:** Inform the ViewGraph v2 format specification with evidence-based findings

---

## Credits and Lineage

ViewGraph's capture format is inspired by the **SiFR v2 format** created by
[Element to LLM](https://addons.mozilla.org/en-US/firefox/addon/element-to-llm/)
(v2.8.1), a browser extension by **Insitu** (info@insitu.im). The SiFR format
introduced several ideas we build on: section-marker keys for greppability,
three-tier salience scoring, spatial clustering with grid positions, budget-based
output sizing, and structural pattern detection with exemplar/instance compression.

ViewGraph v2 is a clean-room redesign. We do not reuse any SiFR code (which is
BSL 1.1 licensed). We adopt the conceptual patterns that work, fix the weaknesses
identified below, and add capabilities the original format lacks.

---

## 1. LLM Token Efficiency Findings

### 1.1 JSON overhead is significant for repeated structures

Research on LLM context compression consistently shows JSON is 20–50% more
token-expensive than alternatives when representing arrays of similar objects
(refs 5, 6, 9, 10). The overhead comes from:

- Repeated key names in every object (e.g., `"tag"`, `"parent"`, `"children"`
  repeated per node)
- Structural characters: `{}`, `[]`, `""`, `,` consume tokens with zero
  semantic value
- Deeply nested objects compound the problem multiplicatively

**Benchmarks (ref 5):**

| Format | Token reduction vs JSON | Notes |
|---|---|---|
| YAML | 10–25% | Minimal for small arrays; grows with array size |
| Columnar JSON | 25–50% | Keys appear once; data as arrays. JSON-compatible |
| Markdown tables | 20–40% | Headers once; highly effective for 100+ rows |
| Field filtering | 30–60% | Removing unused fields is the single biggest win |

**Key insight:** Columnar JSON (keys declared once, data as parallel arrays)
saves 35–45% tokens while remaining valid JSON (ref 5). This is exactly what CDP's
`DOMSnapshot.captureSnapshot` uses (ref 28) — a shared string table with integer
indexes into it. The format was designed for wire efficiency, but it's also
LLM-efficient.

### 1.2 Section markers: good for greppability, minor token cost

SiFR's `====METADATA====` style section markers add ~5 tokens each (6 sections
= ~30 tokens). This is negligible compared to the content. The benefit is real:
LLMs can locate sections by pattern matching, and human developers can grep
captures. **Keep them.**

### 1.3 Nested styles are the biggest token sink

In SiFR v2 captures, computed styles are the largest section by far. A single
node's styles can be 500+ tokens when fully expanded across categories (layout,
spacing, positioning, flexbox, grid, typography, visual, animation, interaction).
For a capture with 300 nodes, styles alone can consume 50K+ tokens.

**The fix:** Progressive style disclosure. The NODES section should contain
zero styles. The DETAILS section should contain styles only for high-salience
nodes, and only non-default values. Medium-salience nodes get layout+visual
only. Low-salience nodes get no styles unless explicitly requested via MCP tool.

### 1.4 LLMs lose focus in the middle of large contexts

The "lost-in-the-middle" phenomenon is well-documented (refs 5, 14): LLMs attend more
strongly to the beginning and end of their context window. For captures, this
means:

- METADATA and SUMMARY should come first (orientation)
- NODES should come next (structural understanding)
- DETAILS should come last (reference material, often not fully read)
- RELATIONS can be compact and placed between NODES and DETAILS

This matches SiFR's current ordering and should be preserved.

---

## 2. SiFR v2 Format Weaknesses

Analysis based on reverse-engineering Element to LLM v2.8.1's `utils.min.js`
(64KB minified) and sample capture files (refs 1, 2, 3, 4).

### 2.1 No formal specification

The format has no spec document, no schema, no versioning contract. The only
"specification" is the code that produces it. This makes it impossible to:
- Build conformant producers without reverse-engineering
- Validate captures programmatically
- Evolve the format with backward compatibility guarantees

### 2.2 Tag abbreviations hurt readability

SiFR abbreviates tags: `btn` for button, `spn` for span, `hdr` for header,
`ftr` for footer, `sctn` for section, `artcl` for article, etc. This saves
a few tokens per node but:
- Forces every consumer to maintain an abbreviation lookup table
- Makes captures harder to read for humans debugging issues
- LLMs already tokenize "button" efficiently (1 token in most tokenizers)
- The savings are ~2 tokens per node × 300 nodes = ~600 tokens — negligible
  compared to the 50K+ tokens in styles

**Recommendation:** Use full HTML tag names. The readability gain far outweighs
the marginal token cost.

### 2.3 Node IDs are opaque and unstable

SiFR generates IDs like `btn001`, `div003`, `a002` — a tag abbreviation plus a
sequential counter. These IDs are:
- Unstable across captures (same element gets different IDs if capture order changes)
- Opaque (no semantic meaning beyond tag type)
- Collision-prone if multiple captures are compared

**Recommendation:** Use human-readable IDs that incorporate semantic hints:
`button:submit-form`, `nav:main-menu`, `input:email-field`. Fall back to
`tag:n001` only when no semantic identifier is available. Include the element's
`data-testid` or `id` attribute in the node ID when present.

### 2.4 No coordinate frame declaration

SiFR bounding boxes are `{x, y, width, height}` with no declaration of what
coordinate system they use. Are they viewport-relative? Document-relative?
CSS pixels? Device pixels? The answer (viewport-relative CSS pixels) must be
inferred from context.

**Recommendation:** Declare the coordinate frame explicitly in METADATA:
```json
"coordinateFrame": {
  "unit": "css-px",
  "origin": "viewport-top-left",
  "scrollOffset": { "x": 0, "y": 150 }
}
```

### 2.5 No provenance or confidence metadata

Every field in a SiFR capture is treated as equally trustworthy. But:
- Bounding boxes from `getBoundingClientRect()` are measured (high confidence)
- Accessible names may be computed from heuristics (variable confidence)
- Salience scores are derived from a custom algorithm (medium confidence)
- Text content from `textContent` is measured, but OCR text would be inferred

**Recommendation:** Add optional provenance tags at the section level, not per
field (too expensive). E.g., METADATA declares: `"provenance": "browser-api"`
for the whole capture, with overrides only where needed.

### 2.6 Structural patterns are complex to parse

SiFR's structural pattern detection (fingerprinting repeated DOM structures,
selecting exemplars, marking instances) is powerful but the output format is
hard to consume:
- Patterns are embedded in SUMMARY with cross-references to NODES and DETAILS
- Exemplar/instance relationships require joining across three sections
- An LLM must understand the compression scheme to interpret the data

**Recommendation:** Make structural patterns self-contained in SUMMARY. Each
pattern should include inline exemplar data (not just IDs), so the LLM can
understand the pattern without cross-referencing.

### 2.7 Relations section is over-engineered for spatial proximity

SiFR computes `above`, `leftOf`, `overlaps` relations with pixel distances
and line-of-sight checks. This is computationally expensive and produces
hundreds of relations that LLMs rarely use. The semantic relations (`labelFor`,
`describedBy`, `controls`) are far more valuable.

**Recommendation:** Split relations into:
- **Semantic relations** (always included): labelFor, describedBy, controls,
  owns — derived from ARIA attributes
- **Spatial relations** (optional, on-demand via MCP tool): above, leftOf,
  overlaps — computed only when requested

### 2.8 No accessibility tree data

SiFR captures ARIA attributes from the DOM but does not capture the browser's
computed accessibility tree. The accessibility tree provides:
- Computed accessible names (which differ from DOM text)
- Computed roles (which differ from explicit `role` attributes)
- States (expanded, selected, checked, disabled)
- The tree structure assistive technologies actually see

Research from the FillApp browser agent paper (ref 14) confirms that accessibility
tree snapshots are the primary context for production browser agents, not raw
DOM. Agents using AX trees achieve ~85% task success vs ~50% for DOM-only.
The Chrome accessibility tree (refs 30, 31) provides computed names and roles that
differ from raw DOM attributes (refs 34, 35).

**Recommendation:** Add an optional `====ACCESSIBILITY====` section containing
the computed AX tree, or integrate AX data into NODES (role, name, state per
node).

---

## 3. Standard Format Export Layer

ViewGraph's native format is optimized for LLM consumption. But users and tools
may need standard formats for interoperability. Rather than changing our core
format, we expose standard-format exports as optional MCP tools.

### 3.1 CDP DOMSnapshot export

**What:** Chrome DevTools Protocol's `DOMSnapshot.captureSnapshot` format (ref 28).
Columnar arrays with a shared string table. Flattened node tree with parallel
layout and style arrays indexed by node position.

**Why:** The most token-efficient DOM representation available. Used by
Playwright MCP, Chrome DevTools MCP, and browser automation tools. Developers
building on CDP tooling can consume this directly.

**MCP tool:** `export_cdp_snapshot({ filename })` — converts a ViewGraph
capture to CDP DOMSnapshot format.

### 3.2 Accessibility tree export

**What:** A simplified accessibility tree matching the format used by Playwright
MCP and the CDP Accessibility domain. Each node has: role, name, description,
value, focused, expanded, selected, checked, disabled, and children.

**Why:** Browser agents (FillApp (ref 14), Browser Use, Playwright MCP (ref 37)) primarily
consume AX tree snapshots. Exporting in this format makes ViewGraph captures
directly usable by any AX-tree-consuming agent.

**MCP tool:** `export_ax_tree({ filename })` — extracts accessibility-relevant
data from a ViewGraph capture and formats it as an AX tree snapshot.

### 3.3 W3C Web Annotation export

**What:** The W3C Web Annotation Data Model (JSON-LD) (refs 32, 33) for the
ANNOTATIONS section. Each annotation becomes a Web Annotation with a
`TextualBody` (the comment) and a `FragmentSelector` or `CssSelector`
targeting the annotated elements.

**Why:** Interoperability with annotation tools, IIIF viewers, and any system
that consumes W3C Web Annotations. Makes our review-mode annotations portable.

**MCP tool:** `export_annotations_w3c({ filename })` — converts ViewGraph
annotations to W3C Web Annotation JSON-LD.

### 3.4 Extension UI for export format selection

The extension popup's settings panel will include an "Export Formats" section:

```
☑ ViewGraph v2 (always on)
☐ CDP DOMSnapshot
☐ Accessibility Tree
☐ W3C Web Annotations (review mode only)
```

When additional formats are checked, the extension produces multiple output
files per capture (e.g., `capture.viewgraph.json`, `capture.cdp.json`,
`capture.axtree.json`). The MCP server indexes all variants and exposes them
through the export tools.

---

## 4. Improvement Proposals for ViewGraph v2

Based on the research above, these are the concrete changes from SiFR v2:

| # | Change | Rationale |
|---|---|---|
| 1 | Full tag names, no abbreviations | Readability > marginal token savings |
| 2 | Semantic node IDs incorporating testid/id/role | Stable, human-readable, debuggable |
| 3 | Explicit coordinate frame in METADATA | Eliminates ambiguity for multimodal agents |
| 4 | Progressive style disclosure (none in NODES, tiered in DETAILS) | 30–50% token reduction |
| 5 | Split relations: semantic (always) vs spatial (on-demand) | Reduces default capture size |
| 6 | Self-contained structural patterns in SUMMARY | LLM can understand without cross-referencing |
| 7 | Optional ACCESSIBILITY section | Aligns with browser agent best practices |
| 8 | Section-level provenance declaration | Trust signals without per-field overhead |
| 9 | Formal versioning with semver in METADATA | Backward compatibility contract |
| 10 | Optional standard-format exports via MCP tools | Interoperability without format compromise |
| 11 | Columnar encoding option for NODES | CDP-style efficiency for large captures |
| 12 | Bbox as `[x, y, w, h]` array not object | ~40% fewer tokens per bbox (4 keys eliminated) |

---

## 5. Competitive Landscape

| Tool | Approach | Format | AI Integration |
|---|---|---|---|
| Element to LLM (Insitu) | Browser ext, DOM capture | SiFR v2 (proprietary) | Clipboard paste to LLM |
| Agentation | Browser ext, UI annotation | Custom JSON | Paste to Claude Code/Codex |
| Playwright MCP | Headless browser, AX tree | CDP AX snapshots | MCP tools |
| Chrome DevTools MCP | Browser automation | CDP protocol | MCP tools |
| **ViewGraph** | Browser ext + MCP server | ViewGraph v2 (open spec) | Bidirectional MCP |

ViewGraph's differentiators: open format spec, bidirectional MCP integration
(not just clipboard), annotation/review mode, screenshot capture, and optional
standard-format exports.

---

## References

### Primary subject: Element to LLM / SiFR format

- [1] Element to LLM v2.8.1, Firefox extension by Insitu (BSL 1.1 license).
  Reverse-engineered from published extension: `lib/utils.min.js` (64KB),
  `content/content.min.js`, `background/background.js`, `popup/popup.js`,
  `manifest.json`, and associated source maps.
  https://addons.mozilla.org/en-US/firefox/addon/element-to-llm/
- [2] Element to LLM, Chrome Web Store listing: "DOM Capture for AI."
  Store description states: "Raw HTML is bloated. Screenshots burn tokens.
  Accessibility trees miss visual context."
  https://chromewebstore.google.com/detail/element-to-llm/oofdfeinchhgnhlikkfdfcldbpcjcgnj
- [3] Element to LLM, Firefox Add-ons version history (v2.6.0–v2.8.1 changelogs).
  Documents bug fixes for child prioritization, content script injection,
  and telemetry.
  https://addons.mozilla.org/en-US/firefox/addon/element-to-llm/versions/
- [4] "Show HN: Element to LLM – Extension That Turns Runtime DOM into JSON
  for LLMs." Hacker News discussion (4 comments). Author (Alechko/Insitu)
  describes use case: "the runtime state the browser is actually rendering."
  https://news.ycombinator.com/item?id=45041345

### LLM token efficiency and context compression

- [5] Zhu, X. "Compressing LLM Context Windows: Efficient Data Formats and
  Context Management." Reinforcement Coding, 2026. Key finding: JSON is
  20–50% more token-expensive than alternatives for repeated structures.
  Columnar JSON saves 35–45%. Markdown tables save 20–40% for large arrays.
  https://www.reinforcementcoding.com/blog/context-compression-efficient-data-formats
- [6] Gilbertson, D. "LLM Output Formats: Why JSON Costs More Than TSV."
  Medium, 2024. Compares token usage across JSON, YAML, TSV, and custom
  formats. JSON uses ~2x tokens vs TSV for equivalent data.
  https://david-gilbertson.medium.com/llm-output-formats-why-json-costs-more-than-tsv-ebaf590bd541
- [7] "Token efficiency with structured output from language models."
  Microsoft Data Science, Medium, 2024. Analysis of token optimization
  methods for JSON and YAML generation.
  https://medium.com/data-science-at-microsoft/token-efficiency-with-structured-output-from-language-models-be2e51d3d9d5
- [8] "Comparing Structured Data Formats for LLMs." nathom.dev, 2025.
  Compares JSON, YAML, TOML, and custom formats for LLM consumption.
  https://nathom.dev/blog/llms_and_structured_data/
- [9] "Why JSON Is Inefficient for LLMs vs TOON and YAML." Scalevise, 2025.
  "JSON is optimized for interoperability and strict validation. LLMs are
  optimized for probabilistic reasoning over dense semantic input."
  https://scalevise.com/resources/json-vs-toon-yaml-llm-context-efficiency/
- [10] "The #1 Mistake Developers Make With LLM APIs (It's Still Using JSON)."
  Orendra, 2025. Discusses token cost of JSON structural overhead.
  https://orendra.com/blog/the-1-mistake-developers-make-with-llm-apis-its-still-using-json/
- [11] "Benchmarking Complex Nested JSON Data Mining for Large Language Models."
  arXiv, 2025. Evaluates LLM performance on nested JSON structures.
  https://arxiv.org/html/2509.25922
- [12] "JSON Response Formatting with Large Language Models." arXiv, 2024.
  Evaluates LLM ability to generate structured JSON outputs.
  https://arxiv.org/html/2408.11061v1
- [13] Boundary ML documentation on token optimization across serialization
  formats. Notes optimal format depends on specific use case and LLM.
  https://docs.boundaryml.com/examples/prompt-engineering/token-optimization

### Browser agents, DOM representation, and web automation

- [14] Vardanyan, A. "Building Browser Agents: Architecture, Security, and
  Practical Solutions." arXiv:2511.19477, 2025. Production browser agent
  achieving ~85% on WebGames benchmark. Key findings: accessibility tree
  snapshots are primary context (not raw DOM), hybrid vision+AX is best,
  agents need progressive disclosure, element references need versioning.
  Grid-based coordinate mapping abandoned in favor of AX-tree-based refs.
  https://arxiv.org/html/2511.19477
- [15] "Show HN: Convert HTML DOM to semantic markdown for use in LLMs."
  Hacker News discussion, 2024. Community feedback on LLM challenges with
  complex markdown tables and column correlation.
  https://news.ycombinator.com/item?id=41043771
- [16] "An Illusion of Progress? Assessing the Current State of Web Agents."
  arXiv, 2025. LLM-as-a-Judge evaluation achieving ~85% agreement with
  human judgment on web agent tasks.
  https://arxiv.org/html/2504.01382v4
- [17] "Scaling Training Environments for Visual Web Agents with Realistic
  Tasks." arXiv, 2026. Notes some agents use accessibility trees while
  visual agents observe screenshots.
  https://arxiv.org/html/2601.02439v1
- [18] "Learning and Leveraging Environment Dynamics in Web Navigation."
  arXiv, 2024. LLM-based web agents in long-horizon tasks.
  https://arxiv.org/html/2410.13232v1
- [19] "Robustifying Multimodal Web Agents Against Cross-Modal Attacks."
  arXiv, 2026. Safety of LLM-based web agents.
  https://arxiv.org/html/2603.04364v1
- [20] "Web Agent Reliability Evaluation on Existing Benchmarks." arXiv, 2025.
  Browser-based LLM agents in controlled vs real environments.
  https://arxiv.org/html/2510.03285v1
- [21] "Evaluating LLM Agents on Real-World Web Navigation Tasks." arXiv, 2025.
  https://arxiv.org/html/2510.02418v1
- [22] "Contents" (web test automation locator stability). arXiv, 2026.
  CSS selectors and XPath are inherently brittle across DOM updates.
  https://arxiv.org/html/2603.20358v1

### Agentic coding assistants and context management

- [23] "Claude.md Becomes Critical Configuration Standard for Agentic
  Workflows." The Next Gen Tech Insider, 2026. Context window saturation
  and instruction drift in agentic coding.
  https://www.thenextgentechinsider.com/pulse/claudemd-becomes-critical-configuration-standard-for-agentic-workflows
- [24] "Why AI Agents Keep Asking the Same Questions." Augment Code, 2026.
  Model weights are frozen, context windows rebuild from scratch.
  https://www.augmentcode.com/guides/why-ai-agents-repeat-questions
- [25] "Developers Report Critical Token Spikes in Claude Code Sessions."
  The Next Gen Tech Insider, 2026. High overhead of system prompts and
  context window loading.
  https://www.thenextgentechinsider.com/pulse/developers-report-critical-token-spikes-in-claude-code-sessions
- [26] "12 Agentic Harness Patterns from Claude Code." Generative Programmer,
  2026. Durable project-level configuration files for agent sessions.
  https://generativeprogrammer.com/p/12-agentic-harness-patterns-from
- [27] "Navigating the Navigation Paradox in Agentic Code Intelligence."
  Own Your AI, 2026. Context windows expanding toward millions of tokens
  does not dissolve retrieval bottlenecks.
  https://ownyourai.com/codecompass-navigating-the-navigation-paradox-in-agentic-code-intelligence/

### Standard formats and protocols

- [28] Chrome DevTools Protocol, DOMSnapshot domain. `captureSnapshot` returns
  flattened arrays with shared string table — columnar format for wire and
  token efficiency. Includes layout bounds, computed styles, paint order.
  https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot
- [29] Chrome DevTools Protocol, Accessibility domain. Full AX tree snapshots
  via CDP. Computed roles, names, states.
  https://chromedevtools.github.io/devtools-protocol/tot/Accessibility
- [30] "Full accessibility tree in Chrome DevTools." Chrome blog, 2021.
  "The accessibility tree is a derivative of the DOM tree... simplified to
  remove nodes with no semantic content."
  https://developer.chrome.com/blog/full-accessibility-tree/
- [31] "How to use Chrome's accessibility tree." Pope Tech, 2023. Practical
  guide to AX tree interpretation. "Assistive technology uses the
  accessibility tree to interpret the content on the page."
  https://blog.pope.tech/2023/11/27/how-to-use-chromes-accessibility-tree/
- [32] W3C, "Web Annotation Data Model." W3C Recommendation, 2017. Structured
  model for annotations with JSON-LD serialization, selector types
  (CSS, XPath, Fragment, SVG), and motivation vocabulary.
  https://www.w3.org/TR/annotation-model/
- [33] W3C, "Web Annotation Vocabulary." W3C Recommendation, 2017.
  https://www.w3.org/TR/annotation-vocab/
- [34] "Aligning LLMs for Accessible Web UI Code Generation." arXiv, 2025.
  LLMs struggle with complex ARIA attributes in generated code.
  https://arxiv.org/html/2510.13914v1
- [35] "Human or LLM? A Comparative Study on Accessible Code Generation
  Capability." arXiv, 2025. LLMs produce more accessible code for basic
  features but struggle with complex ARIA.
  https://arxiv.org/html/2503.15885v1

### Competitive landscape

- [36] Agentation. "The visual feedback tool for AI agents." Product Hunt,
  2026. "Click any element, add a note, and paste the output into Claude
  Code, Codex, or any AI tool."
  https://www.producthunt.com/products/agentation
- [37] Playwright MCP. Microsoft's headless browser MCP server using
  accessibility tree snapshots. Referenced in [14].
- [38] Chrome DevTools MCP. Access to CDP including performance traces and
  full accessibility trees. Referenced in [14].

### Additional context from project docs

- [39] `docs/ideas/technical-design.md` — ViewGraph project technical design
  document (internal). Full architecture spec for extension + MCP server.
- [40] `docs/ideas/output-formats-for-full-fidelity-page-layout-understanding-
  by-agentic-coding-agents.md` — Research survey of representation formats
  for agentic coding agents (internal). Covers DOM, AX trees, CDP snapshots,
  PDF, SVG, design exports, native mobile, annotation standards. Proposes
  Unified Layout Capture Bundle (ULCB) schema.
