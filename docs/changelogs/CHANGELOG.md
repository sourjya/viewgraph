# Changelog

All notable changes to the ViewGraph project.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

---

## [Unreleased]

### Inspect Tab Captures UX Redesign

### Kiro Power Package (M8b)

### MCP Server Audit Fixes

### Z-Index Stacking Context Resolution (M13.1)

### Focus Management Chain (M13.2)

### Scroll Container Detection (M13.4)

### ARIA Landmarks (M13.6)

### ViewGraph Status Command

### Capture Sessions

### Element-Level Diagnostic Hints

### Source Linking (M15.1)

### Component Tree Mapping (R1/M12.3)

### Cross-Page Consistency Checker (R4/M15.3)

### axe-core Integration (R2)

### Framework Source Linking (R6/M15.1)

### Event Listener Inventory (M12.4)

### Annotation Diffing (M10.4)

### Annotation-to-Spec Pipeline (M10.7)
- New `spec-generator.js`: converts annotations into Kiro spec format
- Groups by page and severity, generates requirements.md and tasks.md
- New MCP tool: `generate_spec` - takes captures, outputs structured spec
- 5 unit tests

### Pattern-Based Steering Generation (M10.6)

### Performance Collector (M15.5)

### Auto-Capture on HMR (M14.1)

### User Journey Recording (M14.2)

### Element Flash on Select (M10.1)

### CSS Animation State (M12.5)

### CLI Tools

### Resolution Push (M10.3)

### Keyboard Shortcuts

### WebSocket Live Collaboration (M14.3)

### Enrichment Error Boundary

### Capture Quality Validation

### Low-Priority Cleanup (M13.5, M13.7)

### Security Audit Remediations

### Code Quality Audit Fixes

### Centralize Redundant Code Patterns
- Extension: replaced 5 duplicate `selector()` functions in collectors with shared `buildSelector` from selector.js
- Extension: centralized ATTR constant (12 duplicate definitions) into selector.js, all files now import it
- Extension: extracted `serializeAnnotations()` helper in content.js (was duplicated 2x)
- Server: created `readAndParse()` helper in utils/tool-helpers.js for validate-read-parse pattern
- Server: refactored 7 tool files to use readAndParse (audit-accessibility, audit-layout, get-elements-by-role, get-interactive, get-annotations, get-annotation-context, get-page-summary, find-missing-testids)

### Dead Code Elimination
- Server: removed ENV_HTTP_SECRET (unused export), unused imports in layout-analysis.js, list-sessions.js, analyze-patterns.js, get-session.js
- Extension: removed buildA11yLine, copySelector, fallbackCopy, getFrozenElement, resume (dead functions in annotate.js)
- Extension: removed getSync, setSync (unused exports in storage.js)
- Extension: removed STACKING_TRIGGERS (dead constant in stacking-collector.js, replaced by inline getStackingTrigger)
- Extension: removed unused imports: sendAnnotationCreate/Update/Delete, setName, restore in sidebar; DEFAULT_HTTP_PORT, PORT_SCAN_RANGE in popup

### Code Quality Audit Fixes
- CQ-01: Extracted shared `buildSelector()` to `extension/lib/selector.js` - removed 5 duplicate implementations
- CQ-02: Extracted shared `collectAllEnrichment()` to `extension/lib/enrichment.js` - removed 4 duplicate 15-line blocks
- CQ-04: Fixed stale token fetch - reads from extension storage instead of removed `/info` token field
- CQ-05: Removed 3 unused imports from annotate.js (traverseDOM, scoreAll, serialize)
- CQ-06: Removed unused `path` import from get-unresolved.js
- CQ-07: Fixed `flashElement(el)` -> `flashElement(currentEl)` - flash effect now works on element selection
- CQ-08: Added 3-second fetch timeouts to sidebar /health and /captures calls
- CQ-09: Replaced 15-line repetitive enrichment block in serializer with loop over shared key list
- CQ-10: Replaced 15-line repetitive enrichment block in parser with loop over shared key list
- CQ-12: Converted 8 dynamic `await import()` calls in HTTP receiver to static imports
- CQ-16: Fixed readBody double-settlement with `settled` flag
- Bundle size reduced from 849KB to 848KB from deduplication

### Security Audit Remediations
- S1-1 (HIGH): Removed auth token from `/info` endpoint response
- S1-2 (HIGH): Added `checkAuth()` to `POST /baselines` endpoint
- S1-3 (MEDIUM): WebSocket auth timeout - unauthenticated connections closed after 5s
- S2-1/S2-2/S2-3 (MEDIUM): Wrapped all `JSON.parse` calls in HTTP handlers with try/catch
- S2-4 (MEDIUM): Added `validateCapturePath()` to `setBaseline()` - prevents path traversal
- S4-1 (MEDIUM): Added `server.timeout` (30s) and `server.requestTimeout` (10s) to HTTP server
- S4-2 (MEDIUM): Documented CORS `*` rationale (security relies on auth tokens + 127.0.0.1 binding)
- S5-1 (HIGH): Fixed XSS in options page - replaced innerHTML with textContent for server data
- S5-3 (MEDIUM): Fixed XSS in sidebar settings - replaced innerHTML with createElement
- S5-4 (MEDIUM): Fixed WebSocket token extraction - was reading wrong header key
- Q1-2 (LOW): Fixed duplicate `transitions` key in visualize-flow.js
- Q1-3 (LOW): Fixed duplicate `issues` key in analyze-journey.js

### Low-Priority Cleanup (M13.5, M13.7)
- M13.5: `collectMediaQueries()` extracts `@media` rules from stylesheets, reports active/inactive
- M13.7: Animation collector now reports running/paused/pending counts
- `mediaQueries` added to capture enrichment, serializer, parser, and page summary
- 4 new extension tests

### Capture Quality Validation
- New `capture-validator.js` (extension): checks capture quality before sending
- New MCP tool: `validate_capture` - agents can check capture quality (34th tool)
- Warns on: empty captures, few elements, no interactive elements, missing enrichment, oversized payloads, console errors, failed network requests
- 7 new extension tests

### Enrichment Error Boundary
- New `safe-collect.js`: wraps enrichment collectors so a single failure never crashes the capture
- All 13 enrichment collectors in content.js and auto-capture.js now use `safeCollect()`
- Failed collectors return null and log a warning instead of throwing
- 7 new extension tests

### WebSocket Live Collaboration (M14.3)
- New `ws-server.js`: WebSocket server attached to HTTP receiver via upgrade event
- New `ws-client.js`: extension WebSocket client with auto-reconnect and exponential backoff
- Auth handshake on connect (token-based, same as HTTP auth)
- Extension sends annotation CRUD events in real-time
- Server broadcasts resolution events to all connected clients
- `resolve_annotation` MCP tool now pushes resolution via WebSocket
- Sidebar connects on open, disconnects on destroy
- Keepalive pings every 30 seconds
- WebSocket only created when auth token is configured (no impact on tests)
- 13 new tests (7 server + 6 client)

### Keyboard Shortcuts
- New `keyboard-shortcuts.js`: keyboard shortcut manager for annotate mode
- Escape: deselect / close panel
- Ctrl+Enter: send to agent
- Ctrl+Shift+C: copy markdown
- 1/2/3: set severity (critical/major/minor)
- Delete: remove annotation
- Ignores shortcuts when typing in inputs
- 7 new extension tests

### Resolution Push (M10.3)
- Sidebar now polls `/annotations/resolved` every 5 seconds while open
- Annotations resolved by the agent update in real-time in the sidebar
- Polling starts on sidebar open, stops on sidebar close/destroy
- No WebSocket needed - simple HTTP polling with 3-second timeout

### CLI Tools
- New `viewgraph-status.js`: health check showing server, captures, agent, auth status
- New `viewgraph-doctor.js`: diagnostic tool checking Node.js, npm, deps, builds, ports
- Both registered as npm bin commands

### Capture Stats Tool
- New MCP tool: `get_capture_stats` - aggregate stats across all captures
- Shows total count, unique URLs, date range, annotation counts, average elements

### CSS Animation State (M12.5)
- New `animation-collector.js`: detects active CSS animations/transitions via Web Animations API
- Reports animation name, play state, progress, and duration per element
- Included in capture as `animations` enrichment section
- `get_page_summary` includes `animatingElements` count
- 4 new extension tests

### Intersection State (M13.8)
- New `intersection-collector.js`: checks viewport visibility of interactive elements
- Reports visible, partially visible, and offscreen element counts
- Details for non-visible elements (selector, rect, state)
- Included in capture as `intersection` enrichment section
- `get_page_summary` includes `offscreenElements` count
- 5 new extension tests

### Intent-Based Subtree Capture (M14.4)
- New `subtree-capture.js`: captures focused DOM subtree with full computed styles
- All styles, attributes, and interactivity flags per element
- Respects maxDepth limit for deep trees
- 6 new extension tests

### Element Flash on Select (M10.1)
- New `element-flash.js`: brief highlight pulse on elements after selection
- CSS animation overlay positioned over target element, fades out in 400ms
- Integrated into annotate mode element click handler
- 3 new extension tests

### User Journey Recording (M14.2)
- New `journey-recorder.js`: auto-captures on SPA navigation (pushState, popstate, hashchange)
- Intercepts history.pushState/replaceState for SPA route changes
- Detects link clicks for MPA navigation
- Debounced to avoid capturing during rapid route transitions
- New MCP tool: `analyze_journey` - checks for missing elements, performance degradation, console errors across steps
- 7 new extension tests

### Auto-Capture on HMR (M14.1)
- New `hmr-detector.js`: watches for Vite, webpack, and DOM mutation hot-reload events
- New `auto-capture.js`: triggers full capture on HMR, sends to background for push
- Debounced to avoid rapid-fire captures during successive updates
- Background script handles `auto-capture` message type for push to server
- Content script reads settings on load and starts auto-capture if enabled
- 10 new extension tests (5 HMR detector + 5 auto-capture controller)

### Extension Settings Page (M9.5)
- Options page extended with auto-capture toggle and debounce delay
- Server URL configuration
- Screenshot quality setting (PNG lossless, JPEG high, JPEG low)
- Settings persisted via chrome.storage.sync
- Firefox MV2 and Chrome MV3 builds validated

### Performance Collector (M15.5)
- New `performance-collector.js`: collects browser Performance API metrics
- Navigation timing (page load, DOM content loaded, first byte, DOM interactive)
- Resource timing (slow resources > 500ms, total transfer size)
- Memory info (Chrome only - JS heap size)
- Included in capture as `performance` enrichment section
- `get_page_summary` includes `pageLoadMs` and `slowResources` count
- 4 new extension tests

### Pattern-Based Steering Generation (M10.6)
- New `steering-generator.js`: analyzes resolved annotations for recurring patterns
- Detects dominant categories, element types, and severity distributions
- Generates project-specific recommendations (e.g., "add eslint-plugin-jsx-a11y")
- New MCP tool: `analyze_patterns` - scans all resolved annotations
- 5 unit tests

### Annotation Diffing (M10.4)
- New `annotation-diff.js`: compares annotations across captures chronologically
- Tracks persistent issues, new issues, and resolved issues over time
- New MCP tool: `diff_annotations` - takes 2-20 capture filenames
- 5 unit tests

### Recurring Issue Detection (M10.5)
- New `recurring-issues.js`: scans all annotated captures for UI hot spots
- Identifies elements flagged repeatedly across sessions
- New MCP tool: `detect_recurring_issues` - scans all captures, configurable threshold
- 4 unit tests

### State Machine Visualization (M15.4)
- New `state-machine.js`: builds state diagrams from session captures
- Shows element additions/removals at each step transition
- Generates Mermaid-compatible state diagrams
- New MCP tool: `visualize_flow` - takes step captures, returns Mermaid diagram
- 4 unit tests

### Event Listener Inventory (M12.4)
- New `event-listener-collector.js`: detects event handlers on DOM elements
- Detects HTML event attributes (onclick, onchange, etc.)
- Detects React synthetic events via fiber props (onClick, onChange, etc.)
- Detects Vue event bindings via __vue__ instance
- Flags suspicious elements: cursor:pointer with no detected handler
- Included in capture as `eventListeners` enrichment section
- `get_page_summary` includes `eventListenerCount` and `suspiciousClickables`
- 7 new extension tests

### Framework Source Linking (R6/M15.1)
- `find_source` now accepts `component` parameter for framework component name search
- Searches for `function ComponentName`, `const ComponentName`, `export default`, `class ComponentName`
- Component names from R1 captures feed directly into source linking at high confidence
- 3 new server tests

### Visual Screenshot Diff (R5/M17)
- New `screenshot-diff.js`: pixel-by-pixel PNG comparison using pixelmatch
- Handles different-sized images (crops to common dimensions)
- Configurable threshold (0-1) for sensitivity control
- New MCP tool: `compare_screenshots` - returns diff percentage, changed pixels, verdict
- 6 new server tests

### axe-core Integration (R2)
- New `axe-collector.js`: runs axe-core scan (100+ WCAG rules) during capture
- Scans wcag2a, wcag2aa, wcag21a, wcag21aa, and best-practice rules
- Results capped at 50 violations / 5 nodes each for capture size control
- Included in capture JSON as `axe` enrichment section
- `audit_accessibility` MCP tool now includes axe results when available in capture
- Graceful fallback: if axe-core fails, ViewGraph's 6 built-in rules still run
- Extension bundle size: 261KB -> 835KB (axe-core is ~300KB minified)
- 7 new extension tests

### Cross-Page Consistency Checker (R4/M15.3)
- New `consistency-checker.js`: matches elements across captures by testid, role+class, or tag+class
- Compares 10 style properties (font-size, padding, color, border-radius, etc.) for design system drift
- New MCP tool: `check_consistency` - takes 2-10 capture filenames, reports style inconsistencies
- 7 unit tests + 2 integration tests

### Automated Annotation Status Check (M10.2)
- New MCP tool: `check_annotation_status` - compares annotations against a newer capture
- Detects: still-present elements, missing elements (possibly resolved), already-resolved annotations
- Matches by ancestor selector and testid
- 2 integration tests

### Component Tree Mapping (R1/M12.3)
- New `component-collector.js`: detects React/Vue/Svelte and extracts component names from DOM nodes
- React: reads `__reactFiber$` keys, walks fiber tree for function/class component names and displayName
- Vue: reads `__vueParentComponent` (Vue 3) and `__vue__` (Vue 2) for component names
- Svelte: reads `__svelte_meta` for component file names
- Component data included in capture JSON as `components` section (framework + component list)
- Server parser extracts components; `get_page_summary` includes `framework` and `componentCount`
- Agent can now jump from "div.sc-bdfBwQ" to "ProductCard" instantly
- 13 new extension tests (5 detection + 5 React + 2 Vue + 1 dedup)

### Source Linking (M15.1)
- New `source-linker.js`: searches project codebase for DOM element identifiers
- Search strategy by confidence: data-testid (high) > aria-label (high) > id (medium) > class (low) > text (low)
- Searches .jsx, .tsx, .vue, .svelte, .html, .js, .ts, .css files only
- Skips node_modules, dist, build, .git, and other non-source directories
- Safety limits: max 5000 files, max 200KB per file, max depth 10
- New MCP tool: `find_source` - maps DOM elements to source files with line numbers
- Project root auto-derived from captures directory (two levels up from .viewgraph/captures/)
- 11 unit tests (source linker) + 4 integration tests (MCP tool) = 15 new tests

### Element-Level Diagnostic Hints
- New `element-diagnostics.js`: analyzes a single DOM element for a11y, testid, focus, stacking, and contrast issues
- Integrated into annotation panel: when user clicks an element, contextual hints appear below the comment box
- Checks: missing alt text, empty aria-label, unlabeled inputs, no data-testid, tabIndex=-1, high z-index, low contrast
- Hints are auto-detected, element-specific, and only shown when issues exist
- Connects annotation workflow to diagnostic data without requiring tab switching
- 17 new extension tests

### Capture Sessions
- New `session-manager.js`: manages multi-step flow recording with start/stop/addStep/getState
- Session state persisted to chrome.storage.session (survives sidebar rebuilds, not browser restarts)
- Sidebar UX: record toggle with pulsing red dot, step counter, optional note input per step
- Session metadata embedded in capture JSON as `metadata.session` (id, name, step, note)
- Background script passes session notes through the capture pipeline
- New MCP tools: `list_sessions` (groups captures by session ID) and `get_session` (full step sequence with diffs)
- `get_session` computes URL changes, title changes, and node count deltas between consecutive steps
- Prompt injection notice on session step notes (user-provided content)
- 17 extension tests (session manager) + 8 server tests (MCP tools) = 25 new tests

### ViewGraph Status Command
- New `scripts/viewgraph-status.js`: one-command health check for entire setup
- Checks: captures directory, auth token, MCP config (auto-detects agent), server health, Power assets, gitignore
- Color-coded output: green checkmarks, red failures, yellow warnings
- Available via `npm run status` or `node scripts/viewgraph-status.js`

### ARIA Landmarks (M13.6)
- New `landmark-collector.js`: identifies semantic landmark regions (nav, main, aside, header, footer, role=*)
- Respects HTML5 scoping: header/footer inside article/section are NOT banner/contentinfo
- Detects missing main landmark and duplicate unlabeled landmarks of same role
- Landmarks data included in capture JSON as `landmarks` section
- Inspect tab: LANDMARKS section appears only when issues detected, shows landmark chain
- Server parser extracts landmarks; `get_page_summary` includes `landmarkIssues` count
- 16 new extension tests (11 detection + 5 issues)

### Scroll Container Detection (M13.4)
- New `scroll-collector.js`: identifies scrollable elements (overflow:auto/scroll with scrollable content)
- Calculates nesting depth for each container (how many scroll ancestors)
- Flags nested scroll containers as issues (root cause of "wrong thing scrolls" bugs)
- Scroll data included in capture JSON as `scroll` section (backward compatible)
- Inspect tab: SCROLL section appears only when nested containers detected
- Server parser extracts scroll section; `get_page_summary` includes `scrollContainers` count
- 13 new extension tests (6 detection + 4 nesting + 3 issues)

### Focus Management Chain (M13.2)
- New `focus-collector.js`: captures active element, tab order sequence, focus traps, unreachable elements
- Tab order follows browser rules: tabIndex > 0 first (ascending), then tabIndex = 0 in DOM order
- Detects focus traps (role=dialog, aria-modal=true, dialog[open]) and flags empty traps
- Flags interactive elements with tabIndex=-1 as unreachable
- Focus data included in capture JSON as `focus` section (backward compatible)
- Inspect tab: FOCUS section appears only when issues detected
- Server parser extracts focus section; `get_page_summary` includes `focusIssues` count
- 16 new extension tests (6 tab order + 3 unreachable + 5 traps + 2 active element)

### Z-Index Stacking Context Resolution (M13.1)
- New `stacking-collector.js`: walks DOM to identify stacking context boundaries (position+z-index, opacity, transform, filter, will-change, isolation, mix-blend-mode, contain, fixed/sticky)
- Detects z-index conflicts between overlapping sibling stacking contexts
- Stacking data included in capture JSON as `stacking` section (backward compatible)
- Inspect tab: STACKING section appears only when conflicts detected, shows issue messages and context count
- Server parser extracts stacking section; `get_page_summary` includes `stackingIssues` count
- 17 new extension tests (12 detection + 5 conflict)

### MCP Server Audit Fixes
- Security: `get_fidelity_report` now uses `validateCapturePath()` instead of raw `path.join()` (path traversal fix)
- Security: `get_unresolved` output now includes `_notice` field for prompt injection defense (matches `get_annotations`)
- Renamed `get_annotated_capture` to `get_annotation_context` for clarity (too similar to `get_annotations`)
- Fixed `compare_captures` description: removed "style changes" (code only diffs structural changes)
- Fixed `get_interactive_elements` description: starts with verb phrase ("Return all...")
- Fixed `get_annotation_context` description: starts with verb phrase ("Return a...")
- Added JSDoc to all 20 `register()` functions with `@param` types and `@see` cross-references

### Kiro Power Package (M8b)
- `POWER.md` entry point with YAML frontmatter (name, displayName, description, 14 activation keywords)
- Tool catalog: all 19+ MCP tools documented with descriptions
- Onboarding steps: Node.js check, extension check, init script, hook installation
- Steering file mapping: workflow and resolution docs loaded contextually
- Best practices: capture, annotation, verification, and a11y workflows
- `mcp.json` with local command-based server config
- 3 `.kiro.hook` JSON hooks: Capture and Audit (userTriggered), Fix Annotations (userTriggered), Check TestIDs (fileEdited on UI files)
- Init script updated to dynamically install all hook files (both .kiro.hook and legacy .sh)
- Power directory structure: `power/{POWER.md, mcp.json, steering/, hooks/}`

### Inspect Tab Captures UX Redesign
- Simplified captures section: latest capture summary with relative time and element count
- Auto-diff vs previous capture shown inline (e.g. "+10 elements since previous")
- Older captures shown as compact timestamp timeline (no interactive rows)
- Removed selection, compare, pinning, right-click gestures - power features stay in MCP tools
- Visual separator between diagnostics (viewport/network/console) and capture sections
- AUTO-CAPTURE grouped with captures below the separator
- Server: `GET /captures/compare?a=&b=` endpoint for arbitrary capture diffing
- Init script: `.viewgraph/` directory gitignored (was only `.viewgraph/captures/`) - prevents token leaking
- Init script: upgrades old `.viewgraph/captures` gitignore entries to `.viewgraph/`
- 8 new sidebar tests for captures section UX
- 639 total tests (251 server + 388 extension)

### Security: Zero-Config Auth
- Server auto-generates UUID token at startup, writes to `.viewgraph/.token` (mode 0600)
- Token exposed via `GET /info` endpoint for extension auto-discovery
- Extension reads token during server discovery, includes `Bearer` header on all POSTs
- `VIEWGRAPH_HTTP_SECRET` env var overrides auto-generated token
- Closes gap where any localhost page could POST crafted captures to the server

### Security: Annotation Prompt Injection Defense
- `get_annotations` and `get_annotated_capture` wrap output with `_notice` field marking comments as user-provided UI feedback
- Steering doc instructs agent to treat annotation comments as bug reports, not instructions
- Security assessment updated from ACCEPTED to MITIGATED

### Capture Request Decline Flow
- `decline(id, reason)` method on request queue, `POST /requests/:id/decline` endpoint
- `get_request_status` returns `{ status: "declined", reason }` when user declines
- Extension sidebar shows Decline button (X) next to Capture on request cards
- Steering doc tells agent to inform user and not auto-retry on decline
- 3 new server tests for decline lifecycle

### Capture Request Purpose Icons
- `request_capture` accepts optional `purpose` param: `capture`, `inspect`, `verify`
- Sidebar shows purpose-specific icon: bell (capture), magnifier (inspect), checkmark (verify)

### Bug Fixes
- **BUG-005:** Screenshot crops produced garbage when page was scrolled. `cropRegions` now receives actual scroll position from content script, clamps to image bounds. 10 regression tests.
- **BUG-006:** Collapsed sidebar strip lost all icons (expand, mode buttons) because `updateBadgeCount` replaced `innerHTML`. Rewritten to update a targeted count element without destroying children.
- **Send to Agent** now always includes full capture (was annotations-only when no prior capture)

### Sidebar UI Polish
- Collapsed strip: icons doubled to 32px, annotation count shown in chat bubble SVG
- Header icons: 14px to 18px, padding 6px to 8px, hover backgrounds on all buttons
- Status dot: margin + ring outline so it doesn't crowd into button hover states
- Title shortened to "ViewGraph" for more header breathing room
- Clear All: native `confirm()` replaced with themed card dialog (dark, red border, Cancel/Clear All)

### Auto-Detect Project Mapping
- Server `GET /info` endpoint returns `capturesDir` and `projectRoot` (derived from captures path)
- Extension sidebar fetches `/info` directly (with background proxy fallback for CSP)
- Settings shows auto-detected project root and captures dir (read-only)
- Options page: "Active Mapping" section with green/grey connection dot
- Manual overrides hidden behind toggle for power users
- `lookupCapturesDir` priority: manual overrides (if enabled) > auto-detected from `/info`
- 4 new server tests for `/info` endpoint and path derivation

### Sidebar UX Improvements
- Two-line entry layout: #id + element + comment on line 1, severity/category chips on line 2
- Mode button hints: "Click to select", "Shift+drag area", "Add a page note"
- Themed scrollbar: 8px, dark rounded thumb matching sidebar background
- Lighter hover color on entries for better visibility
- Tabs (Open/Resolved/All) hidden when settings screen is active
- Advanced settings link opens options in new tab (not embedded in chrome://extensions)

### Page Notes
- Separate P-prefix numbering (P1, P2, P3) - no gaps in element annotation sequence
- Styled cyan badge with document SVG icon (replaces emoji)
- Auto-opens comment panel when adding a page note
- Separate `nextPageNoteId` counter persisted to chrome.storage

### Init Script Improvements
- Kills existing ViewGraph server processes before spawning fresh one (prevents stale servers)
- Detached server start with `stdio: 'ignore'` - init exits cleanly
- Installs Kiro Power assets (steering docs + hooks)

### Power Assets
- Hook rewritten in Kiro JSON format (was invalid YAML frontmatter)
- `post-fix-verify.kiro.hook`: `fileEdited` trigger with `askAgent` action

### Test Coverage
- 528 total tests (219 server + 309 extension)

### Layout Audit (M11.1)
- New `audit_layout` MCP tool: detects overlap, overflow, and viewport overflow issues
- Layout analysis module: `buildNodeMap`, `buildChildrenMap`, `detectOverflows` (1px tolerance), `detectOverlaps` (2px tolerance, siblings only), `detectViewportOverflows`, `analyzeLayout`
- Returns structured JSON with `overflows`, `overlaps`, `viewportOverflows`, and `summary` counts
- 24 new tests (20 unit + 4 integration)

### Contrast Ratio Audit (M11.2)
- WCAG contrast ratio checking integrated into `audit_accessibility` tool
- Contrast module: `parseColor` (hex 3/6 digit, rgb, rgba), `relativeLuminance`, `contrastRatio`, `checkContrast`
- AA failure = error severity, AAA-only failure = warning severity
- Large text threshold: >= 18px uses relaxed AA (3:1) and AAA (4.5:1) thresholds
- Skips elements without text or computedStyles
- 26 new tests (21 contrast unit + 5 a11y rule integration)


### Viewport Visibility Flags (M11.3)
- `isInViewport(bbox, viewport)` utility in node-queries.js (>50% area threshold)
- `inViewport` boolean flag added to `get_elements_by_role` and `get_interactive_elements` output
- 6 new tests (5 unit + 1 integration)

### Form Validation State (M11.4)
- `form-validation-error` rule in audit_accessibility
- Detects `aria-invalid="true"` and required fields with empty value
- 4 new tests (2 positive, 2 negative)

### Network State Capture (M12.1)
- `collectNetworkState()` reads Performance API at capture time
- Captures URL, initiatorType, duration, transferSize, startTime, failed flag
- Sorts by startTime descending, caps at 100 entries, truncates URLs to 200 chars
- Added as `network` section in capture JSON (backward compatible)
- Server parser extracts network section; parseSummary includes networkSummary
- 7 extension tests + 3 serializer tests + 3 parser tests

### Console Error Capture (M12.2)

### Continuous Capture (M14.1)
- MutationObserver watcher: 2s debounce, filters VG UI elements, pauses when tab backgrounded
- Vite HMR detection: listens for `vite:afterUpdate` custom event with 1s debounce
- Rate limited to 1 auto-capture per 5 seconds, disabled on pages > 2000 elements
- Auto-capture toggle in Inspect tab (ON/OFF button between viewport and network)
- 7 new watcher tests (debounce, rate limit, VG filtering, HMR, start/stop)

### Phase C - Expandable Diff Detail
- /baselines/compare endpoint returns element details (tag, text, selector) capped at 10 per category
- Inspect tab diff rows are clickable - expand to show specific added/removed/moved elements

### Regression Baselines (M15.2)
- Baseline storage module: save/load/list golden captures in `.viewgraph/baselines/` keyed by normalized URL
- `set_baseline` MCP tool: promote a capture to baseline for its URL
- `compare_baseline` MCP tool: diff latest capture vs baseline with interactive count delta and summary
- `list_baselines` MCP tool: list all stored baselines with metadata
- HTTP endpoints: GET /captures, GET /baselines, POST /baselines, GET /baselines/compare
- Extension Inspect tab: captures history section, star button to set baseline, diff vs baseline display
- 13 new baseline storage tests

### Phase A+B UX Redesign
- **Two-tab sidebar:** Review (annotations, filters, export) + Inspect (page diagnostics)
- **Inspect tab:** viewport breakpoint indicator, network requests (collapsible, failed highlighted), console errors/warnings (collapsible), visibility warnings (hidden-by-ancestor elements)
- **Enrichment in exports:** markdown Copy MD includes Environment section (breakpoint, failed requests, console errors); ZIP Report includes network.json and console.json
- **Sidebar entries simplified:** severity encoded as number badge color (red/yellow/gray/purple), no category chips in list
- **Trash button relocated:** moved from header to filter tab row (Open | Resolved | All | trash)
- **Settings as overlay:** slide-over panel instead of screen replacement
- **Tooltip fixed at 2 lines:** breadcrumb + meta always, no variable-height conditional lines
- **Viewport label:** Inspect tab breakpoint shows "VIEWPORT [2xl] 1685px" with section header
- **Network false-positive fix:** cached/dev-server resources no longer flagged as failed (checks decodedBodySize)
- **UX design doc:** docs/architecture/ux-analysis.md - two-tab model, design decisions, user journeys

### Responsive Breakpoint Context (M12.6)
- `collectBreakpoints()` reports active CSS media query breakpoints at current viewport
- Standard breakpoints (xs through 2xl) with min-width/max-width match status
- `activeRange` field identifies the current breakpoint name
- Added as `breakpoints` section in capture JSON; surfaced in `get_page_summary`
- 4 extension tests + 1 parser test

### isRendered Ancestor Walk (M13.3)
- `checkRendered(el)` walks ancestor chain checking opacity:0, clip-path:inset(100%), off-screen positioning
- `isRendered` boolean flag added to every node in capture output
- Catches elements that pass individual visibility checks but are hidden by ancestors
- 7 extension tests
- `installConsoleInterceptor()` wraps console.error/warn early in content script
- Captures message, stack trace, timestamp; preserves original console behavior
- Truncates messages to 500 chars, caps at 50 per level
- Added as `console` section in capture JSON (backward compatible)
- Server parser extracts console section; parseSummary includes consoleSummary
- 7 extension tests + 2 parser tests
