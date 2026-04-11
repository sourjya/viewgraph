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

### Test Coverage
- 560 total tests (234 server + 326 extension)
### Multi-Project Capture Routing
- URL-based project routing: extension sends x-captures-dir header, server writes to override dir
- Extension options page with project mappings (URL pattern -> captures directory)
- Server allowedDirs config: x-captures-dir must match allowlist (403 on unauthorized dirs)
- `viewgraph init` auto-registers project in server allowedDirs
- `viewgraph init` writes absolute capturesDir path (Kiro IDE cwd fix)
- Server port fallback: tries 9876-9879 on EADDRINUSE instead of crashing
- Extension auto-discovers MCP server on ports 9876-9879, matches by capturesDir
- Server auth disabled when no VIEWGRAPH_HTTP_SECRET set (localhost-only is safe)
- 11 routing tests, 6 auth tests, 4 config tests

### Kiro Power Assets
- Created `power/` directory with steering docs and hooks
- `viewgraph-workflow.md` steering: when/how to use captures, annotations, resolution
- `viewgraph-resolution.md` steering: resolution format, action enum, summary guidelines
- `post-fix-verify.kiro.hook`: auto-request verification capture after HTML/CSS edits
- `viewgraph init` installs steering docs and hooks for Kiro users
- ADR-008: Kiro Power packaging decision

### Unified Review Panel - Phase 3: Bidirectional Resolution + Kiro Requests
- `guidance` parameter on `request_capture` MCP tool (optional, max 500 chars)
- GET /annotations/resolved?url= endpoint for extension sync
- Extension syncs resolved state from server on sidebar open (last-write-wins)
- All annotation fields persisted to chrome.storage (uuid, severity, category, timestamp, resolution)
- Kiro requests as timeline items: bell icon, URL, guidance note, Capture Now button
- /requests/pending now includes guidance field
- 7 new server tests (resolved endpoint + guidance)

### Unified Review Panel - Phase 4: Export Updates
- Markdown export: page notes section, category tags, resolution details
- Resolution includes action, by, summary, filesChanged
- sanitize() for backticks and pipes in markdown output
- 9 new export tests
- 343 total tests (165 server + 178 extension)

### Unified Review Panel - Phase 2: Sidebar Redesign
- Extension icon click opens sidebar directly (no popup)
- Non-injectable page detection (chrome://, about:, devtools://, data:, view-source:, Web Store)
- Fallback popup with specific error messages for blocked pages
- Unified timeline: open items on top with count header, resolved in collapsed accordion
- Severity/category chips shown inline in timeline entries
- Page-note type: Note button in footer, memo icon in timeline, no element reference
- Capture button in sidebar footer (explicit user action)
- Collapsible Settings section: server status (green/red dot), options page link
- Send behavior: annotations-only when no capture, bundled when capture exists
- captureMode field: 'review' (with capture) or 'annotations-only' (without)
- 327 tests (158 server + 169 extension)

### Unified Review Panel - Phase 1: Data Model + Server
- UUID (crypto.randomUUID) on all annotations
- Severity and category fields with dismissable chip UI
- `resolve_annotation` MCP tool: action enum (fixed/wontfix/duplicate/invalid), summary, filesChanged
- `get_unresolved` MCP tool: single capture or cross-capture scan
- Backward compatibility: old captures normalized with uuid, type, resolved defaults
- Format version bumped to 2.2.0
- 10 new server tests for resolution workflow

### Extension UX Fixes
- Export buttons show icons in success/loading states (checkmark SVG, not text-only)
- Annotation severity selector (Critical/Major/Minor) in comment panel
- Severity tags in markdown export
- Placeholder text guides expected behavior ("What should this look like?")
- 292 total tests (148 server + 144 extension)

### Milestone 7b: Unified Annotate Mode (ADR-006)
- Merged inspect and review into single annotate mode - one mode, two gestures
- Click element to annotate, shift+drag to annotate region - both open comment panel
- Popup simplified to two buttons: Capture + Annotate
- Click dedup: clicking already-annotated element reopens panel instead of creating duplicate
- Drag selection clamped to viewport bounds (no overflow past edges)
- Hover tooltip skips sidebar and all annotate UI children
- Sidebar close button directly dismisses annotate mode
- Legacy data-vg-review/data-vg-inspector elements cleaned up on start
- Panel positions left of marker when near right edge/sidebar
- Sidebar title: "ViewGraph: Review Notes"
- Collapsed badge: 40px filled chat bubble with centered count
- 183 extension tests

### Milestone 7c: Multi-Export Annotations
- Three export buttons in sidebar: Send to Kiro / Copy Markdown / Download Report
- Markdown formatter: structured bug report with ancestor labels, resolved status
- Enriched markdown: viewport, browser, element tag/selector/placeholder, font size, region dimensions
- Screenshot cropping: per-annotation viewport crops via canvas
- ZIP assembly: markdown + cropped PNGs packaged via JSZip
- All export buttons disabled when no annotations
- Annotation numbers (#id) shown in sidebar entries for page marker correlation
- Sidebar entries expand on hover (400ms delay) to show full comment, collapse on mouseout
- Sidebar collapse pauses annotation interaction (no accidental clicks)
- Element annotations capture computed styles (fontSize, fontFamily, color, bg)
- Ovoid toggle switches in popup settings with separator line
- 197 extension tests, 328 total

### Extension UX Improvements
- Popup: dark background fills edge-to-edge, header icon alignment fixed
- Inspector: copy selector uses fallback textarea method, shows tick confirmation, returns to inspect mode
- Inspector: action bar click detection walks DOM tree to prevent false unfreeze on SVG clicks
- Review: shift+drag fixed with stopPropagation, Escape exits review mode
- Review: annotation sidebar renamed to "Review Notes" with chat icon header
- Review: collapsed sidebar shows horizontal badge with chat icon + count + chevron (doubled size)
- Review: empty state hint "Shift + drag to select a region"
- Review: common ancestor label on markers (e.g. div.card.p-4) in monospace
- Review: brief 500ms outline flash on intersected elements after drag-select
- Review: comment changes sync to sidebar in real-time
- Review: annotation panel has close button + click-outside-to-dismiss
- Review: manual resolve toggle (circle/checkmark) with strikethrough on comment only
- Review: annotations persist to chrome.storage.local keyed by URL
- Review: "Send to Kiro" button in sidebar (disabled when empty)
- Review: clicking Review again loads saved annotations from storage
- Modes are mutually exclusive: inspect exits review, review exits inspect, capture exits both
- Settings footer in popup: gear icon toggles JSON/HTML/Screenshot capture options
- Capture message simplified to "Captured N elements" (no filename)
- 134 extension tests

### Milestone 7: Deployment, Testing, and Automation
- Build script: `scripts/build-extension.sh` - Chrome/Firefox/all targets
- Version bump: `scripts/bump-version.sh` - semver validation, updates all package.json files
- CI script: `scripts/ci.sh` - install, lint, server tests, extension tests, build
- Test fixtures: review-capture.json (3 annotations with ancestor labels, 1 resolved), subtree-capture.json
- Server setup runbook: `docs/runbooks/server-setup.md`
- 265 total tests (131 server + 134 extension)

### Milestone 6: Review Mode + Annotations
- Region selector: shift+drag to draw selection rectangles
- Numbered markers: colored overlays with badge numbers on selected regions
- Annotation panel: floating comment input with delete, anchored to region
- Annotation sidebar: collapsible list, click to scroll + edit, inline delete
- Node intersection: finds elements overlapping selection by >= 50%
- Review-mode send: bundles annotations + full page capture, pushes to MCP server
- Annotations serialized into capture JSON for MCP tool consumption
- Popup Review button enabled with inject-first pattern
- 14 review unit tests, 228 total tests (128 server + 100 extension)

### Milestone 5: Hover Inspector
- Inspector module: hover overlay (depth-colored), rich tooltip, scroll-wheel DOM walking, shadow DOM piercing
- Click-to-capture: captures selected element's subtree as ViewGraph JSON, pushes to MCP server
- Escape-to-cancel: cleans up all overlays and exits inspect mode
- Popup UI: added Inspect Element button
- Traverser: now accepts optional root element for subtree capture
- 8 inspector unit tests (tooltip text builder)
- 174 total tests (128 server + 46 extension) across 31 files

### Security
- Shared secret authentication on all HTTP POST endpoints (captures, ack, snapshots)
- Write-path validation via validateCapturePath on /captures and /snapshots
- Extension sends Bearer token from chrome.storage.local
- Security assessment document: 8 risks assessed, 3 mitigated, 4 accepted, 1 negligible
- 10 security tests (auth + path validation)

### Milestone 4: Extension Core Capture
- DOM traverser: depth-first walk, element extraction, parent-child nids, alias generation, CSS selectors
- Salience scorer: weighted scoring (interactivity, testid, aria, viewport, size, semantic tags), 3-tier classification
- Serializer: ViewGraph v2.1 JSON with metadata, summary, nodes, relations, details sections
- Content script: on-demand injection, capture message handler, HTML snapshot support
- Popup UI: Capture Page button, status display (info/success/error states)
- Background service worker: capture orchestration, screenshot, HTTP push to MCP server
- HTML snapshot serializer for fidelity measurement
- Extension unit tests: traverser (15), salience (13), serializer (10) = 38 tests via vitest+jsdom
- Total project: 156 tests (118 server + 38 extension) across 29 files

### Milestone 3: MCP Request Bridge
- Request queue: in-memory Map-based queue with TTL, lazy expiry, URL normalization
- HTTP receiver: Node.js built-in http server with /health, /requests/pending, /requests/:id/ack, /captures endpoints
- MCP tool: request_capture - queue a capture request for the browser extension
- MCP tool: get_request_status - poll for capture request completion
- Full lifecycle integration test: request -> poll -> ack -> submit -> completed
- 21 new tests across 4 files (106 total, 24 files)

### Documentation
- Spec index: added extension-core (M4) and singlefile-fidelity specs
- Roadmap: marked M1+M2 Complete, linked M3 and M4 specs, added singlefile-fidelity cross-cutting spec
- Main README: added M3 Bidirectional Tools section
- Server README: added M3 planned tools section
- Extension README: added extension-core spec link

### Fixed
- MCP config path updated from old `sifr-mcp-server` to `viewgraph` folder name

---

## [0.1.0] - 2026-04-08

### Added
- Project scaffolding: npm workspaces with `server/` and `extension/`
- MCP server stub with `@modelcontextprotocol/sdk`, stdio transport, graceful shutdown
- Firefox extension scaffold with WXT framework, MV3 manifest, popup + background stubs
- ESLint flat config with recommended rules, ES module support
- Vitest configured for server unit tests
- Git scripts (`scripts/git-*.sh`) with output logging to `logs/`
- Kiro steering docs adapted from ai-video-editor (project-agnostic)
- Kiro hooks: comment-standards-check, changelog-check, changelog-rolling
- Code review prompt, TDD tasks template, security reviewer agent
- Technical design document with full architecture spec
- Project roadmap with 8 milestones (docs/roadmap/roadmap.md)

### Changed
- Renamed project from Sifr to ViewGraph across all config, source, and documentation files

### Milestone 1: MCP Server Core Tools
- ViewGraph v2 parser: parseMetadata, parseCapture, parseSummary (never throws, returns result objects)
- In-memory capture indexer with add/remove/list/getLatest and LRU eviction
- File watcher using chokidar (watches directory, filters to .json)
- Path validation utility preventing directory traversal
- MCP tools: list_captures, get_capture, get_latest_capture, get_page_summary
- Config resolution: .viewgraphrc.json file discovery with directory walk-up, env var override
- Test fixtures: valid capture, annotated capture, malformed capture
- 29 unit tests passing (parser: 11, indexer: 11, config: 6, smoke: 1)

### Milestone 2: MCP Analysis Tools
- Shared analysis modules: node-queries.js, a11y-rules.js (3 rules), capture-diff.js
- 7 MCP tools: get_elements_by_role, get_interactive_elements, find_missing_testids, audit_accessibility, compare_captures, get_annotations, get_annotated_capture
- Node queries handle both array and nested SiFR node formats

### Refactoring and Standards
- Parser: removed SiFR `====SECTION====` key fallback, plain keys only
- Imports: converted all relative imports to `#src/` subpath aliases (Node.js native)
- Character encoding: replaced all em/en dashes with hyphens project-wide
- Steering: added character encoding rule, import path rule

### Architecture and Documentation
- ADR-001: Universal agent integration (Kiro, Claude Code, Cursor, Windsurf)
- ADR-002: Multi-project capture routing (URL-to-project routing, discovery protocol)
- ViewGraph v2 format spec updated to v2.1.0 (12 recommendations integrated)
- Scans and recommendations catalog: 22 scans across 6 categories
- Product positioning and GTM strategy
- Problem-to-feature mapping for 7 core USPs
- Extension UX ideas (annotation toolbar, comments) and intelligence/memory features
- Format research doc expanded to 44 references, 20 improvement proposals

### Milestone 1: Integration Tests
### Milestone 1: Integration Tests
- Watcher integration test: file indexing on add, non-JSON filtering
- MCP tool integration tests via InMemoryTransport: list_captures (4), get_capture (3), get_latest_capture (3), get_page_summary (2)
- Test helper: createTestClient() for MCP server+client pair setup
- 43 total tests across 9 files, all passing

### ViewGraph v2 Format Specification
- Formal format spec: docs/architecture/viewgraph-v2-format.md (13 sections)
- Format research doc: docs/architecture/viewgraph-format-research.md (40 references)
- Analyzed Element to LLM v2.8.1 SiFR format  -  identified 8 weaknesses, proposed 12 improvements
- Key design decisions: semantic node IDs, compact bbox arrays, progressive style disclosure,
  semantic-only relations by default, optional ACCESSIBILITY and CONSOLE sections
- Standard format export layer: CDP DOMSnapshot, AX tree, W3C Web Annotation (via MCP tools)
- Competitive landscape analysis: E2LLM, Agentation, Playwright MCP, Chrome DevTools MCP

### Project Documentation
- Root README.md, server/README.md, extension/README.md
- Spec index: .kiro/specs/README.md with M1 linked
- Roadmap: M0 marked complete, M1 marked in-progress with spec link
- Fixed server/package.json description (Sifr → ViewGraph)
- Added docs/artifacts/ to .gitignore (third-party code for analysis)
