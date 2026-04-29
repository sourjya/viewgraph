# Web Store Submission Materials - v0.9.2

## Chrome Web Store Description

### Short Description (132 chars max)
Capture DOM snapshots, annotate UI issues, and send them to your AI coding agent via MCP. 41 tools, 21 collectors, v3 format.

### Detailed Description

ViewGraph Capture gives AI coding agents structured context about your web pages. Click elements, describe what's wrong, and send the annotated DOM snapshot to your AI assistant - it receives the full page structure, styles, accessibility data, and your comments.

**How it works:**
1. Click the ViewGraph icon on any page
2. Click elements or drag to select regions
3. Add comments describing what to fix
4. Click "Send to Agent" - your AI receives everything

**What your agent gets:**
- Full DOM structure with computed styles
- 21 enrichment collectors: network requests, console errors, accessibility audit (axe-core), focus chain, stacking contexts, breakpoints, components, animations, and more
- Your annotations with element context
- Action Manifest: pre-indexed interactive elements with short refs for 80-85% fewer tokens
- Style dedup and default omission for 30-45% smaller captures

**Works with any MCP-compatible agent:**
Kiro, Claude Code, Cursor, Windsurf, Cline, and others. 41 MCP tools for querying, auditing, comparing, and fixing UI issues.

**No AI agent? No problem:**
- Copy Markdown - paste bug reports into Jira, Linear, or GitHub
- Download Report - ZIP with screenshots and structured data
- Works standalone as a QA annotation tool

**v0.9 highlights:**
- v3 format: Action Manifest, short refs, structural fingerprint, spatial index
- 64% smaller content script (axe-core lazy loaded)
- Container merging reduces node count by 30-50%
- observationDepth parameter: interactive-only mode uses ~400 tokens vs ~100K
- Performance instrumentation: capture timings in every snapshot
- TracePulse integration for frontend-backend error correlation
- Welcome page on first install

**Privacy:** All data stays on your machine. No external servers, no telemetry, no tracking. Open source (AGPL-3.0).

---

## Firefox Add-ons (AMO) Description

### Summary (250 chars max)
Capture DOM snapshots, annotate UI issues, and send to your AI coding agent via MCP. 41 tools, 21 enrichment collectors. Works with Kiro, Claude Code, Cursor, Windsurf.

### Description

ViewGraph Capture gives AI coding agents structured context about your web pages. Annotate issues in the browser, send to your AI assistant, and watch them get fixed.

**How it works:**
1. Click the ViewGraph icon on any page
2. Click elements or drag to select regions
3. Add comments describing what to fix
4. Click "Send to Agent" - your AI receives the full DOM context

**What makes it different:**
- 21 enrichment collectors capture network state, console errors, accessibility violations, focus chain, stacking contexts, and more
- v3 format with Action Manifest reduces token consumption by 80-85% for interactive queries
- Style dedup and default omission cut capture size by 30-45%
- Works with any MCP-compatible AI agent (Kiro, Claude Code, Cursor, Windsurf, Cline)

**No AI agent needed for QA:**
- Copy Markdown for Jira/GitHub bug reports
- Download ZIP reports with screenshots
- Standalone annotation tool for testers and reviewers

**Privacy:** All data stays local. No external servers, no telemetry. Open source (AGPL-3.0).

---

## Firefox Add-ons - Release Notes (v0.9.2)

### What's New
- **v3 Format (Phase 1-3 complete):** Action Manifest with pre-indexed interactive elements and short refs (@e1-@eN). Structural fingerprint for cache-hit detection. Spatial index quadtree for O(log n) element queries. Set-of-Marks section linking numbered labels to refs. Checkpoint/resume envelope for multi-step workflows.
- **64% smaller content script:** axe-core loaded lazily from web-accessible resource instead of bundling (856KB to 305KB).
- **Container merging:** Semantically empty wrapper divs merged at capture time, reducing node count by 30-50%.
- **observationDepth parameter:** Request only interactive elements (~400 tokens) instead of full capture (~100K tokens).
- **TOON compact format:** Header-then-rows serialization for action manifest, ~87% fewer tokens than JSON.
- **Performance instrumentation:** Every capture includes traverseMs, enrichmentMs, serializeMs timings.
- **TracePulse integration:** Frontend errors bridged to backend monitoring for cross-stack correlation.
- **Welcome page** on first install with 3-step setup guide.
- **Security fixes:** Path validation on file write parameters, PII redaction expanded, timing data no longer leaks to page scripts.

### Bug Fixes
- Arbitrary file write via filePath parameter (SRR-009 S3-7)
- Performance marks leaked to page scripts (SRR-009 S5-1)
- Storage collector missed PII patterns (SRR-009 S9-1)
- Container merge preserved nodes with data-* attributes (SRR-009 S3-8)
- TOON format quote escaping (SRR-009 S5-2)

---

## Firefox Add-ons - Notes for Reviewer

### What this extension does
ViewGraph Capture is a developer tool that captures structured DOM snapshots from web pages and sends them to AI coding assistants via the Model Context Protocol (MCP). It's used by developers to annotate UI bugs and send them to AI agents for fixing.

### Permissions justification
- **activeTab:** Required to capture the DOM of the current tab when the user clicks the extension icon.
- **storage:** Stores user preferences (auto-capture settings, collapse state) and annotation data between sessions.
- **scripting:** Injects the content script that performs DOM traversal and annotation overlay rendering.
- **alarms:** Background sync polling for resolved annotations (checks every 5 minutes if the MCP server has resolved any issues).
- **host_permissions (<all_urls>):** The extension needs to capture DOM from any page the developer is working on. It only activates when the user clicks the toolbar icon - no background page scanning.

### Key changes in this version
1. **axe-core lazy loading:** Previously bundled (856KB), now loaded from `public/axe.min.js` as a web-accessible resource via script injection. This is the `axe-core` npm package (v4.11.2) - an accessibility testing library. It's injected into the page's main world to run WCAG audits. The file is shipped with the extension, not fetched from a CDN.

2. **web_accessible_resources:** `axe.min.js` is declared as web-accessible so the content script can load it via `chrome.runtime.getURL()`. This does allow pages to detect the extension is installed (fingerprinting), but the alternative (bundling) adds 550KB to every page load.

3. **No remote code:** All JavaScript is bundled with the extension. No CDN fetches, no eval(), no dynamic code loading from external sources. The only dynamic import is `axe.min.js` from the extension's own `public/` directory.

4. **No data collection:** No telemetry, no analytics, no external server communication. All capture data stays in the local `.viewgraph/` directory. The MCP server runs locally on the developer's machine (localhost only).

### How to test
1. Install the extension
2. Open any web page (e.g., https://example.com)
3. Click the ViewGraph icon in the toolbar - sidebar opens
4. Click an element on the page - annotation marker appears
5. Type a comment in the annotation panel
6. Click "Copy MD" to export as markdown (no MCP server needed for this)

### Source code
https://github.com/sourjya/viewgraph (AGPL-3.0)
