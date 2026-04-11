# Changelog

All notable changes to the ViewGraph project.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

Previous entries: [CHANGELOG.2026-04-08.md](./CHANGELOG.2026-04-08.md) (project scaffolding through M7)

---

## [Unreleased]

### Code Quality

#### Dead Code Elimination (2026-04-12)
- Server: removed unused exports (ENV_HTTP_SECRET), unused imports in 4 tool files
- Extension: removed 5 dead functions in annotate.js, 2 unused exports in storage.js, dead STACKING_TRIGGERS constant
- Extension: removed unused imports in sidebar (ws-client, session-manager) and popup (constants)

#### Redundancy Centralization (2026-04-12)
- Extension: replaced 5 duplicate `selector()` functions with shared `buildSelector` from selector.js
- Extension: centralized ATTR constant (12 duplicate definitions) into selector.js
- Extension: extracted `serializeAnnotations()` helper in content.js
- Server: created `readAndParse()` helper in utils/tool-helpers.js, applied to 8 tool files

#### Code Quality Audit (2026-04-11)
- CQ-01: Extracted shared `buildSelector()` - removed 5 duplicate implementations
- CQ-02: Extracted shared `collectAllEnrichment()` - removed 4 duplicate 15-line blocks
- CQ-04: Fixed stale token fetch in extension
- CQ-07: Fixed `flashElement` - flash effect now works on element selection
- CQ-08: Added 3-second fetch timeouts to sidebar calls
- CQ-09/CQ-10: Replaced repetitive enrichment blocks with loops in serializer and parser
- CQ-12: Converted 8 dynamic imports in HTTP receiver to static imports
- CQ-16: Fixed readBody double-settlement

#### Security Audit (2026-04-11)
- S1-1 (HIGH): Removed auth token from `/info` endpoint response
- S1-2 (HIGH): Added auth to `POST /baselines` endpoint
- S1-3 (MEDIUM): WebSocket auth timeout - unauthenticated connections closed after 5s
- S2-1/S2-2/S2-3 (MEDIUM): Wrapped all `JSON.parse` calls in HTTP handlers with try/catch
- S2-4 (MEDIUM): Added path traversal prevention to `setBaseline()`
- S4-1 (MEDIUM): Added server timeouts (30s connection, 10s request)
- S5-1/S5-3 (HIGH/MEDIUM): Fixed XSS in options page and sidebar settings
- S5-4 (MEDIUM): Fixed WebSocket token extraction

---

### MCP Server - Annotation Intelligence (M10)

#### Annotation Status Check (M10.2)
- `check_annotation_status` tool: compares annotations against newer capture to detect resolved issues
- Matches by ancestor selector and testid

#### Resolution Push (M10.3)
- Sidebar polls `/annotations/resolved` every 5 seconds while open
- Annotations resolved by agent update in real-time

#### Annotation Diffing (M10.4)
- `diff_annotations` tool: tracks persistent, new, and resolved issues across 2-20 captures
- New `annotation-diff.js` analysis module

#### Recurring Issue Detection (M10.5)
- `detect_recurring_issues` tool: scans all captures for UI hot spots
- New `recurring-issues.js` analysis module

#### Pattern Analysis (M10.6)
- `analyze_patterns` tool: detects recurring patterns from resolved annotations
- New `steering-generator.js`: generates project-specific recommendations

#### Spec Generation (M10.7)
- `generate_spec` tool: converts annotations into Kiro spec format (requirements.md + tasks.md)
- New `spec-generator.js` analysis module

---

### Extension - Enrichment Collectors

#### Z-Index Stacking Contexts (M13.1)
- `stacking-collector.js`: identifies stacking context boundaries, detects z-index conflicts between siblings
- 17 tests

#### Focus Management Chain (M13.2)
- `focus-collector.js`: tab order, focus traps, unreachable elements (tabIndex=-1)
- 16 tests

#### Scroll Container Detection (M13.4)
- `scroll-collector.js`: identifies scrollable elements, flags nested scroll containers
- 13 tests

#### Media Queries (M13.5)
- `breakpoint-collector.js` extended: extracts `@media` rules from stylesheets

#### ARIA Landmarks (M13.6)
- `landmark-collector.js`: semantic landmark regions, missing `<main>`, duplicate unlabeled landmarks
- 16 tests

#### Pending Animations (M13.7)
- Animation collector extended: reports running/paused/pending counts

#### Intersection State (M13.8)
- `intersection-collector.js`: viewport visibility via IntersectionObserver
- 5 tests

---

### Extension - Capture Automation

#### Auto-Capture on HMR (M14.1)
- `hmr-detector.js`: watches for Vite, webpack, and DOM mutation hot-reload events
- `auto-capture.js`: triggers full capture on HMR with debounce
- 10 tests

#### Journey Recording (M14.2)
- `journey-recorder.js`: auto-captures on SPA navigation (pushState, popstate, hashchange)
- `analyze_journey` MCP tool: checks for issues across journey steps
- 7 tests

#### WebSocket Collaboration (M14.3)
- `ws-server.js`: WebSocket server for real-time annotation sync
- `ws-client.js`: extension client with auto-reconnect and exponential backoff
- Auth handshake, keepalive pings, annotation CRUD broadcast
- 13 tests

#### Subtree Capture (M14.4)
- `subtree-capture.js`: focused DOM subtree capture with full computed styles
- 6 tests

---

### Extension - UI Features

#### Element Flash (M10.1)
- `element-flash.js`: green highlight pulse on element selection (400ms fade)
- 3 tests

#### CSS Animation State (M12.5)
- `animation-collector.js`: detects active CSS animations/transitions via Web Animations API
- 4 tests

#### Event Listener Inventory (M12.4)
- `event-listener-collector.js`: detects HTML, React, and Vue event handlers
- Flags suspicious cursor:pointer elements with no handler
- 7 tests

#### Keyboard Shortcuts
- `keyboard-shortcuts.js`: Esc (deselect), Ctrl+Enter (send), Ctrl+Shift+C (copy MD), 1/2/3 (severity), Delete (remove)
- 7 tests

#### Capture Quality Validation
- `capture-validator.js`: quality checks before export (empty pages, few elements, missing enrichment)
- `validate_capture` MCP tool (34th tool)
- 7 tests

#### Enrichment Error Boundary
- `safe-collect.js`: wraps all collectors so one failure never crashes the capture
- 7 tests

---

### MCP Server - Session and Journey (M15)

#### Source Linking (M15.1)
- `source-linker.js`: maps DOM elements to source files by testid, aria-label, id, class, text
- `find_source` tool with component name search support
- 15 tests

#### Regression Baselines (M15.2)
- `set_baseline`, `compare_baseline`, `list_baselines` tools
- Golden capture storage in `.viewgraph/baselines/`
- 13 tests

#### Cross-Page Consistency (M15.3)
- `consistency-checker.js`: matches elements across captures, compares 10 style properties
- `check_consistency` tool
- 9 tests

#### State Machine Visualization (M15.4)
- `state-machine.js`: builds Mermaid state diagrams from session captures
- `visualize_flow` tool
- 4 tests

#### Performance Collector (M15.5)
- `performance-collector.js`: navigation timing, resource timing, LCP, CLS, FID
- 4 tests

---

### Strategic Features (R-series)

#### Component Tree Mapping (R1/M12.3)
- `component-collector.js`: React/Vue/Svelte component detection and name extraction
- 13 tests

#### axe-core Integration (R2)
- `axe-collector.js`: 100+ WCAG rules, capped at 50 violations
- `audit_accessibility` includes axe results when available
- 7 tests

#### Screenshot Diff (R5/M17)
- `screenshot-diff.js`: pixel-by-pixel PNG comparison via pixelmatch
- `compare_screenshots` tool
- 6 tests

---

### Kiro Power Package (M8b)
- `POWER.md` entry point with YAML frontmatter and 14 activation keywords
- 3 `.kiro.hook` files: Capture and Audit, Fix Annotations, Check TestIDs
- 7 prompts: vg-audit, vg-review, vg-capture, vg-diff, vg-testids, vg-a11y, vg-help
- 3 steering docs: workflow, resolution, hostile DOM handling
- `mcp.json` with local command-based server config
- Init script installs all assets to user projects

---

### CLI Tools
- `viewgraph-status.js`: health check (server, captures, agent, auth, Power assets)
- `viewgraph-doctor.js`: diagnostic tool (Node.js, npm, deps, builds, ports)

---

### Inspect Tab UX Redesign
- Simplified captures section: latest capture summary with auto-diff vs previous
- Compact timestamp timeline for older captures
- Removed selection, compare, pinning gestures - power features stay in MCP tools
- `GET /captures/compare` endpoint for arbitrary capture diffing
- 8 tests

---

### Sidebar and Extension UX
- Two-tab sidebar: Review (annotations, filters, export) + Inspect (page diagnostics)
- Collapsed strip: 32px mode icons, chat bubble annotation count
- Themed confirmation dialog for destructive actions
- Page notes with P-prefix numbering (P1, P2, P3)
- Agent request cards with purpose icons (capture/inspect/verify) and Decline button
- Auto-detect project mapping via `/info` endpoint
- Zero-config auth (auto-generated token)
- Server discovery on ports 9876-9879
- Connection status green dot

---

### Foundation (M0-M8)

See [CHANGELOG.2026-04-08.md](./CHANGELOG.2026-04-08.md) for:
- Project scaffolding and workspace setup
- MCP server core tools (M1): list_captures, get_capture, get_latest, get_page_summary
- MCP analysis tools (M2): elements by role, interactive, testids, a11y, layout, diff, annotations
- MCP request bridge (M3): request_capture, get_request_status, fidelity report
- Extension core capture (M4): DOM traversal, serialization, salience scoring
- Unified annotate mode (M7b): click + drag + page notes
- Multi-export (M7c): Send to Agent, Copy Markdown, Download Report ZIP
- Unified review panel (M7d): two-tab sidebar
- Layout audit (M11.1): overflow, overlap, viewport detection
- Contrast ratio audit (M11.2): WCAG AA/AAA checking
- Viewport visibility flags (M11.3): inViewport boolean
- Network state capture (M12.1): Performance API requests
- Console error capture (M12.2): interceptor with stack traces
- Responsive breakpoints (M12.6): active CSS media query detection
- isRendered ancestor walk (M13.3): opacity, clip-path, off-screen detection

---

### Test Counts

| Component | Tests |
|---|---|
| Server | 324 |
| Extension | 599 |
| **Total** | **923** |
