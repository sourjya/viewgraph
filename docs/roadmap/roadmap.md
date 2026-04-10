# ViewGraph  -  Project Roadmap

**Created:** 2026-04-08
**Status:** Active
**Total estimated effort:** 4-6 weeks

Each milestone below will be converted into a full Kiro spec under
`.kiro/specs/{milestone-name}/` with `requirements.md`, `design.md`, and
`tasks.md` before implementation begins.

---

## Milestone 0: Project Scaffolding (Day 1)

**Goal:** Working project skeleton with tooling, CI, and both components buildable.

| # | Task | Details |
|---|---|---|
| 0.1 | Initialize npm workspaces | Root `package.json` with `workspaces: ["server", "extension"]` |
| 0.2 | Scaffold MCP server | `server/package.json`, `server/index.js` stub, install `@modelcontextprotocol/sdk`, `zod` |
| 0.3 | Scaffold extension with WXT | `npx wxt init extension`, configure for Firefox MV3 |
| 0.4 | Configure ESLint | Shared config at root, ES module rules |
| 0.5 | Configure Vitest | Server tests in `server/tests/`, extension tests in `extension/tests/` |
| 0.6 | Create git scripts | `scripts/git-{status,stage,commit,push,branch}.sh` piping to `logs/` |
| 0.7 | Initialize git repo | `.gitignore`, initial commit on `main` |
| 0.8 | Create `docs/changelogs/CHANGELOG.md` | Initial entry |
| 0.9 | Register MCP server in Kiro | `.kiro/settings/mcp.json` pointing to `server/index.js` |

**Exit criteria:** `npm run dev` starts both server and extension. `npm test` runs
(and passes with zero tests). Kiro can connect to the MCP server (even if no tools exist yet).

**Effort:** 0.5 days

---

## Milestone 1: MCP Server  -  Core Tools (Days 2-4) 🔧

**Goal:** MCP server reads existing ViewGraph capture files from disk and exposes
core query tools to Kiro.

**Spec:** [`.kiro/specs/mcp-server-core/`](../../.kiro/specs/mcp-server-core/)
**Status:** Complete

| # | Task | Details |
|---|---|---|
| 1.1 | File watcher | Watch `VIEWGRAPH_CAPTURES_DIR` for new `.json` files. Use `chokidar` (not `fs.watch`  -  unreliable on WSL/Windows boundary). |
| 1.2 | Indexer | Parse `====METADATA====` from each capture, maintain in-memory index (filename, url, title, timestamp, node count). Rebuild on startup. |
| 1.3 | ViewGraph v2 parser | Parse all sections (METADATA, NODES, SUMMARY, RELATIONS, DETAILS, ANNOTATIONS). |
| 1.4 | Tool: `list_captures` | Input: `{ limit?, url_filter? }`. Returns array of capture metadata. |
| 1.5 | Tool: `get_latest_capture` | Input: `{ url_filter? }`. Returns full JSON or summary if >100KB. |
| 1.6 | Tool: `get_capture` | Input: `{ filename }`. Returns full ViewGraph JSON. Path validation against captures dir. |
| 1.7 | Tool: `get_page_summary` | Input: `{ filename }`. Returns extracted summary: url, title, layout, styles, element counts, clusters. |
| 1.8 | Integration tests | Use `InMemoryTransport` to test all 4 tools end-to-end. |
| 1.9 | Manual Kiro test | Register server, verify tools appear, test with real capture file. |

**Exit criteria:** Kiro can list captures, get the latest, query a specific capture,
and get a page summary  -  all from existing ViewGraph JSON files on disk.

**Effort:** 2-3 days

---

## Milestone 2: MCP Server  -  Analysis Tools (Days 5-7) 🔧

**Goal:** Advanced query and analysis tools for UI auditing and test generation.

**Spec:** [`.kiro/specs/mcp-analysis-tools/`](../../.kiro/specs/mcp-analysis-tools/)
**Status:** Complete

| # | Task | Details |
|---|---|---|
| 2.1 | Tool: `get_elements_by_role` | Filter nodes by role: buttons, links, inputs, headings, images. |
| 2.2 | Tool: `get_interactive_elements` | All clickable/editable elements with selectors and labels. |
| 2.3 | Tool: `find_missing_testids` | Interactive elements lacking `data-testid`. |
| 2.4 | Tool: `audit_accessibility` | Elements missing aria-label, alt text, form labels. |
| 2.5 | Tool: `compare_captures` | Diff two captures: added/removed elements, layout shifts, style changes, testid changes. |
| 2.6 | Tool: `get_elements_near` | Elements within a bounding box region. |
| 2.7 | Tool: `get_annotations` | Return annotations from review-mode captures. |
| 2.8 | Tool: `get_annotated_capture` | Capture filtered to annotated nodes + comments. |
| 2.9 | Integration tests | All analysis tools tested with fixture captures. |

**Exit criteria:** Kiro can audit a11y, find missing testids, compare captures,
and read annotations from review-mode captures.

**Effort:** 2-3 days

---

## Milestone 3: MCP Server  -  Bidirectional Communication (Days 8-9)

**Goal:** Kiro can request captures from the extension via the MCP server.

**Spec:** [`.kiro/specs/mcp-request-bridge/`](../../.kiro/specs/mcp-request-bridge/)
**Status:** Complete

| # | Task | Details |
|---|---|---|
| 3.1 | HTTP receiver | Express or raw `http.createServer` with `/capture`, `/pending`, `/ack/:id` endpoints. |
| 3.2 | Request queue | In-memory queue with states: pending → in_progress → completed / expired. TTL-based expiry. |
| 3.3 | Tool: `request_capture` | Queue a capture request. Returns `{ request_id, status }`. |
| 3.4 | Tool: `get_request_status` | Poll for request completion. Returns status + filename when done. |
| 3.5 | Integration tests | Test full request lifecycle with mock extension client. |

**Exit criteria:** Kiro can call `request_capture`, the HTTP endpoint serves the
request to a polling client, and `get_request_status` returns the result.

**Effort:** 1-2 days

---

## Cross-Cutting: SingleFile Fidelity Measurement

**Goal:** Pair HTML snapshots with ViewGraph JSON captures to measure and track capture fidelity.

**Spec:** [`.kiro/specs/singlefile-fidelity/`](../../.kiro/specs/singlefile-fidelity/)
**Status:** Complete

Spans server (snapshot receiver, fidelity comparator, `get_fidelity_report` tool) and extension
(HTML snapshot capture). Can be implemented incrementally alongside M3 and M4.

---

## Milestone 4: Firefox Extension  -  Core Capture (Days 10-15)

**Goal:** Working Firefox extension with popup UI, DOM traversal, and ViewGraph JSON output.

**Spec:** [`.kiro/specs/extension-core/`](../../.kiro/specs/extension-core/)
**Status:** Complete

| # | Task | Details |
|---|---|---|
| 4.1 | WXT project setup | Configure for Firefox MV3, manifest permissions, build pipeline. |
| 4.2 | Popup UI | Mode switcher with Screenshot, ViewGraph Capture, Select Element buttons. Status display. |
| 4.3 | DOM traverser | Content script: walk DOM tree, extract tag/role/name/bbox/selectors/attributes. |
| 4.4 | Salience scorer | Classify elements as high/med/low based on interactivity, size, visibility. |
| 4.5 | Spatial clusterer | Group nearby elements into clusters with bounding boxes. |
| 4.6 | Style extractor | Extract computed styles: colors, fonts, layout properties. |
| 4.7 | Serializer | Format output as ViewGraph v2 JSON with all sections. |
| 4.8 | Disk output | Save JSON via `browser.downloads.download()` to captures dir. |
| 4.9 | Full-page screenshot | Scroll-and-stitch via `captureVisibleTab`. Handle Firefox MV3 bugs. |
| 4.10 | MCP push | POST capture JSON + base64 screenshot to MCP server `/capture` endpoint. |
| 4.11 | Request poller | Poll `GET /pending`, ACK, perform capture, POST result. |
| 4.12 | Chrome testing | Full manual test in Chrome with WXT dev server. |
| 4.13 | Firefox build + test | Build, sign (or use Developer Edition), test all capture modes. |

**Exit criteria:** Extension captures DOM + screenshot, saves to disk, pushes to
MCP server. Kiro can request a capture and receive the result.

**Effort:** 5-6 days

---

## Milestone 5: Hover Inspector + Select Element (Days 16-19)

**Goal:** Interactive element inspection with DOM tree walking.

**Spec:** `.kiro/specs/extension-inspector/`
**Status:** Complete

| # | Task | Details |
|---|---|---|
| 5.1 | Hover overlay | Transparent div positioned over hovered element. Color-coded by nesting level. |
| 5.2 | Rich tooltip | Show tag, role, accessible name, data-testid, bbox dimensions, depth. |
| 5.3 | Scroll-wheel DOM walking | Scroll up = parent, scroll down = child. Update overlay + tooltip in real-time. |
| 5.4 | Shadow DOM piercing | `shadowRoot.elementFromPoint()` for open shadow roots. |
| 5.5 | Click to capture | Capture selected element's subtree as ViewGraph JSON. |
| 5.6 | Escape to cancel | Clean up overlay and tooltip on Escape. |
| 5.7 | Cross-browser testing | Verify overlay positioning, tooltip rendering, scroll behavior in Chrome + Firefox. |

**Exit criteria:** User can hover over any element, scroll to navigate nesting,
and click to capture a subtree.

**Effort:** 3-4 days

---

## Milestone 6: Review Mode + Annotations (Days 20-25)

**Goal:** Drag-select regions, annotate with comments, batch send.

**Spec:** `.kiro/specs/extension-review-mode/`
**Status:** Complete

**UX Reference:** [`docs/ideas/extension-ux-and-intelligence.md`](../ideas/extension-ux-and-intelligence.md) - floating toolbar, comment box, highlight overlay patterns

| # | Task | Details |
|---|---|---|
| 6.1 | Region selector | Shift+drag to draw rectangle. Blue dashed outline. |
| 6.2 | Node intersection | Find all elements whose bbox overlaps selection by ≥50%. |
| 6.3 | Numbered markers | Persist selections as numbered colored overlays on page. |
| 6.4 | Floating annotation panel | Comment input, selected nodes list, Save/Delete buttons. |
| 6.5 | Annotation sidebar | Collapsible list of all annotations. Click to scroll + highlight. |
| 6.6 | Delete flow | Remove overlay, annotation, sidebar entry. Keyboard shortcut. |
| 6.7 | Resize handles | Drag edges of existing selections to resize. |
| 6.8 | Review Mode send | Bundle all annotations + full page capture + screenshot. Save/push. |
| 6.9 | ANNOTATIONS section | Serialize annotations into ViewGraph JSON output. |
| 6.10 | End-to-end test | Create annotations in extension → verify Kiro reads them via `get_annotations`. |

**Exit criteria:** User can enter Review Mode, make multiple annotated selections,
and send a bundled capture that Kiro can read and act on.

**Effort:** 5-6 days

---

## Milestone 7: Deployment, Testing, and Automation (Days 26-30)

**Goal:** Repeatable build, test, and deployment pipeline.

**Spec:** `.kiro/specs/deployment-automation/`

### Extension Deployment

| # | Task | Details |
|---|---|---|
| 7.1 | Build script | `scripts/build-extension.sh`  -  runs WXT build for Firefox + Chrome. |
| 7.2 | Package script | `scripts/package-extension.sh`  -  creates `.zip` for AMO submission. |
| 7.3 | AMO submission guide | `docs/runbooks/amo-submission.md`  -  step-by-step for signing + publishing. |
| 7.4 | Version bump script | `scripts/bump-version.sh`  -  updates manifest + package.json versions. |

### MCP Server Deployment

| # | Task | Details |
|---|---|---|
| 7.5 | Install script | `scripts/install-server.sh`  -  `npm install` in server/, verify Node version. |
| 7.6 | Kiro registration script | `scripts/register-mcp.sh`  -  writes/updates `.kiro/settings/mcp.json` in target project. |
| 7.7 | Health check | `scripts/test-server.sh`  -  sends JSON-RPC initialize to server, verifies response. |
| 7.8 | Startup docs | `docs/runbooks/server-setup.md`  -  how to configure captures dir, HTTP port, env vars. |

### Automated Testing

| # | Task | Details |
|---|---|---|
| 7.9 | Server unit tests | Vitest suite for all parsers, indexer, request queue. |
| 7.10 | Server integration tests | `InMemoryTransport` tests for all MCP tools. |
| 7.11 | Extension unit tests | Vitest + jsdom for DOM traverser, salience scorer, serializer. |
| 7.12 | Extension integration tests | WXT test utils for popup UI, inspector overlay, annotation panel. |
| 7.13 | E2E smoke test | Script that: starts server → loads extension → captures a test page → verifies Kiro can read the capture. |
| 7.14 | CI script | `scripts/ci.sh`  -  runs lint + all tests. Can be wired to GitHub Actions later. |
| 7.15 | Test fixtures | Sample ViewGraph captures (standard + annotated) in `server/tests/fixtures/`. |

### Manual Testing Checklist

| # | Test | Steps |
|---|---|---|
| M1 | Quick screenshot | Click 📸 → verify PNG saved to captures dir |
| M2 | ViewGraph capture | Click 📋 → verify JSON + PNG saved, push to MCP |
| M3 | Select element | Click 🎯 → hover → scroll to parent → click → verify subtree JSON |
| M4 | Review mode | Enter review → drag-select region → annotate → send → verify in Kiro |
| M5 | Remote capture | In Kiro: `request_capture` → verify extension fulfills → result returned |
| M6 | Compare captures | Capture page → make change → capture again → `compare_captures` in Kiro |
| M7 | Cross-browser | Repeat M1-M4 in both Chrome and Firefox |

**Exit criteria:** `npm test` passes all unit + integration tests. Build scripts
produce installable extension packages. Server can be registered in any project
with one script. Manual testing checklist passes on Chrome + Firefox.

**Effort:** 4-5 days

---

## Milestone 7b: Unified Annotate Mode (Days 28-29)

**Goal:** Merge inspect and review into a single annotation mode.

**ADR:** [`docs/decisions/ADR-006-merge-inspect-review.md`](../decisions/ADR-006-merge-inspect-review.md)
**Spec:** `.kiro/specs/unified-annotate-mode/`
**Status:** Complete

| # | Task | Details |
|---|---|---|
| 7b.1 | Unified state machine | `lib/annotate.js` - click to annotate element, shift+drag to annotate region |
| 7b.2 | Popup simplification | Two buttons: Capture + Annotate (replaces Capture + Inspect + Review) |
| 7b.3 | Content script rewire | Single `toggle-annotate` message, exit mode before capture |
| 7b.4 | Click dedup | Clicking already-annotated element reopens panel instead of creating duplicate |
| 7b.5 | Viewport clamping | Drag selection clamped to viewport bounds |
| 7b.6 | Legacy cleanup | Remove old inspector.js and review.js (Phase 4) |

**Exit criteria:** One mode, two gestures. All annotations flow through unified sidebar.

---

## Milestone 7c: Multi-Export Annotations (Days 29-30)

**Goal:** Multiple export destinations for annotations - AI agents, testers, issue trackers.

**Spec:** `.kiro/specs/multi-export/`
**Status:** Complete

| # | Task | Details |
|---|---|---|
| 7c.1 | Markdown formatter | `lib/export-markdown.js` - structured bug report with ancestor labels |
| 7c.2 | Screenshot cropping | `lib/screenshot-crop.js` - crop viewport PNG per annotation region |
| 7c.3 | ZIP assembly | `lib/export-zip.js` - markdown + screenshots packaged via JSZip |
| 7c.4 | Three-button sidebar | Send to Kiro / Copy Markdown / Download Report |
| 7c.5 | Settings toggle | Include screenshots in reports (popup settings panel) |

**Exit criteria:** Testers can annotate and export without MCP server or AI agent.

---

## Milestone 7d: Unified Review Panel

**Goal:** Redesign sidebar into unified timeline with page notes, Kiro request tracking,
bidirectional resolution, and single-button entry point.

**Spec:** [`.kiro/specs/unified-review-panel/`](../../.kiro/specs/unified-review-panel/)
**ADR:** [`docs/decisions/ADR-007-jsonl-history-store.md`](../decisions/ADR-007-jsonl-history-store.md)
**Status:** Complete

Key features:
- Extension icon opens sidebar directly (no popup)
- Unified timeline: captures, annotations, page notes, Kiro requests
- Bidirectional resolution tracking (Kiro marks issues as fixed)
- Resolved items accordion
- Capture is always explicit (no auto-capture)
- Non-injectable page detection with specific error messages

See spec for full requirements, design, and task breakdown.

---

## Milestone 8: Universal Agent Integration (Days 28-30)

**Goal:** Plug-and-play support for all major agentic coding tools.

**ADR:** [`docs/decisions/ADR-001-universal-agent-integration.md`](../decisions/ADR-001-universal-agent-integration.md)
**Spec:** `.kiro/specs/universal-integration/`

| # | Task | Details |
|---|---|---|
| 8.1 | Extensible init architecture | Refactor `viewgraph-init.js` into dispatcher + agent-specific setup modules (`scripts/setup/{base,kiro,cursor,claude-code,generic}.js`). Each module: `detect()`, `setup()`. Shared interface, independent evolution. |
| 8.2 | Research: Cursor integration | Investigate `.cursorrules`, Cursor MCP config format, any packaging/skills system |
| 8.3 | Research: Claude Code integration | Investigate Claude Skills, `.claude/mcp.json`, dynamic tool loading |
| 8.4 | Research: Windsurf/Cline integration | Investigate config formats, MCP support, any steering mechanisms |
| 8.5 | Tool detection | Detect Kiro, Claude Code, Cursor, Windsurf, Cline by config directory presence |
| 8.6 | Streamable HTTP transport | `--transport http --port 9091` flag for remote/team scenarios |
| 8.7 | npm package setup | `package.json` bin entry, publish as `viewgraph-mcp-server` |
| 8.8 | Setup runbooks | Per-tool setup guides in `docs/runbooks/` (kiro, claude-code, cursor, windsurf) |
| 8.9 | Health check CLI | `npx viewgraph doctor` - verify server starts, tools register, captures dir accessible |
| 8.10 | Integration tests | Test stdio + HTTP transports, test init command for each tool |
| 8.11 | Team URL mappings | `.viewgraphrc.json` urlMappings for beta/staging/prod URLs, env tagging on captures, server exposes mappings via /health for extension auto-config |

**Exit criteria:** `npx viewgraph init` works for Kiro, Claude Code, Cursor,
and Windsurf. Server works over both stdio and HTTP transports. npm package
installable globally.

**Effort:** 2-3 days

---

## Milestone 8b: Kiro Power Package (Days 31-33)

**Goal:** Package ViewGraph as a Kiro Power for one-click install and dynamic activation.

**ADR:** [`docs/decisions/ADR-008-kiro-power-packaging.md`](../decisions/ADR-008-kiro-power-packaging.md)
**Spec:** [`.kiro/specs/kiro-power/`](../../.kiro/specs/kiro-power/)
**Depends on:** [Unified Review Panel](../../.kiro/specs/unified-review-panel/) spec

A Kiro Power bundles MCP tools + steering docs + hooks into a single installable unit.
ViewGraph tools activate dynamically when the user mentions UI, annotation, layout,
accessibility, etc. - zero context overhead when doing non-UI work.

| # | Task | Details |
|---|---|---|
| 8b.1 | POWER.md | Entry point with activation keywords, onboarding steps, tool catalog, workflow steering references |
| 8b.2 | Steering: viewgraph-workflow.md | When to check annotations, how to read captures, when to request captures |
| 8b.3 | Steering: viewgraph-resolution.md | Resolution format, action enum, summary guidelines, filesChanged conventions |
| 8b.4 | Hook: post-fix-verify | After HTML/CSS/JSX edits, auto-call `request_capture` with guidance for verification |
| 8b.5 | Hook: annotation-to-spec | When user says "create spec from annotations", generate requirements.md from open annotations |
| 8b.6 | MCP config in Power | mcp.json bundled in Power, no manual config needed |
| 8b.7 | Onboarding flow | POWER.md onboarding: check extension installed, run init if needed, verify connection |
| 8b.8 | Publish to Kiro Powers | Submit to Kiro Powers ecosystem (or import from GitHub URL) |

**Exit criteria:** User installs ViewGraph Power in Kiro IDE with one click.
Mentioning "UI issue" activates ViewGraph tools. Steering docs guide Kiro through
annotation workflow and resolution format. Post-fix hook auto-requests verification captures.

**Effort:** 2-3 days

---

## Milestone 9: Advanced Tools + Polish (Days 34+)

**Goal:** Power features and production hardening.

**Spec:** `.kiro/specs/advanced-tools/`

**Intelligence Reference:** [`docs/ideas/extension-ux-and-intelligence.md`](../ideas/extension-ux-and-intelligence.md) - recurring issue detection, regression watchlist, style profiles, agent mistake tracking

| # | Task | Details |
|---|---|---|
| 9.1 | Capture history timeline | Track captures per URL over time. Tool: `get_capture_history`. |
| 9.2 | Accessibility tree capture | CDP Accessibility domain integration for computed a11y names/roles. |
| 9.3 | Provenance metadata | Tag each field with source: measured/derived/inferred/user-provided. |
| 9.4 | Incremental diffs | JSON Patch between captures for streaming/regression workflows. |
| 9.5 | Extension settings page | Full options page with all configurable settings. |
| 9.6 | Extension onboarding | Welcome page on install with feature walkthrough. |
| 9.7 | Performance optimization | Lazy-load heavy modules, optimize DOM traversal for large pages. |

**Effort:** Ongoing

---

## Milestone 10: Smart Review + Agent Intelligence (Future)

**Goal:** Richer review feedback loop between extension and MCP server, plus
cross-agent compatibility via Powers cross-compatibility.

| # | Task | Details |
|---|---|---|
| 10.1 | Element flash on select | Brief highlight pulse on intersected elements after drag-select completes. |
| 10.2 | Automated resolve detection | MCP tool `check_annotation_status` compares annotation nodeIds against latest capture. Marks resolved/stale. |
| 10.3 | Resolution push | Server pushes annotation status updates to extension via HTTP. Extension updates sidebar icons. |
| 10.4 | Annotation diffing | Compare annotations across captures - track which issues persist across deploys. |
| 10.5 | Recurring issue detection | Flag elements that appear in multiple annotation sessions. |
| 10.6 | Pattern-based steering generation | Analyze resolved annotations to generate project-specific steering docs (e.g. "80% of issues are a11y - add linting") |
| 10.7 | Annotation-to-spec pipeline | Generate `.kiro/specs/` from batched annotations with requirements and tasks |
| 10.8 | Cross-agent Power compatibility | When Kiro Powers support Cursor/Claude Code/Cline, validate ViewGraph Power works across all |
| 10.9 | Power auto-update | When ViewGraph ships new tools or steering, Power updates propagate to installed users |

**Effort:** TBD

---

## Milestone 11: Enhanced Capture Intelligence (Future)

**Goal:** Enrich captures and analysis tools with layout, contrast, viewport, and
form state data so AI agents can debug visual issues without seeing the page.

Prioritized by agent feedback (Kiro IDE session 2026-04-10): items ranked by how
much they change an AI's ability to fix UI issues from capture data alone.

| # | Task | Priority | Details |
|---|---|---|---|
| 11.1 | Overlap/overflow detection | P0 - highest | DONE. `audit_layout` MCP tool with `detectOverflows`, `detectOverlaps`, `detectViewportOverflows`. 24 tests. |
| 11.2 | WCAG contrast ratio audit | P0 - high | DONE. `contrast.js` module integrated into `audit_accessibility`. AA/AAA pass/fail. 26 tests. |
| 11.3 | Viewport visibility flags | P1 - medium | DONE. `isInViewport` flag on `get_elements_by_role` and `get_interactive_elements`. >50% area threshold. 6 tests. |
| 11.4 | Form validation state | P2 - lower | DONE. `form-validation-error` rule in `audit_accessibility`. Checks `aria-invalid` and required+empty. 4 tests. |

**Exit criteria:** `audit_layout` tool detects overlap/overflow issues. `audit_accessibility`
includes contrast ratios with WCAG pass/fail. Viewport visibility flags on all nodes.

**Effort:** ~1 week

---

## Milestone 12: Capture Context Enrichment (Future)

**Goal:** Enrich DOM captures with runtime context (network, console, components)
so AI agents can diagnose root causes, not just symptoms.

Prioritized by agent feedback (Kiro IDE session 2026-04-10): ranked by how often
these would have caught real bugs without back-and-forth.

| # | Task | Priority | Details |
|---|---|---|---|
| 12.1 | Network/API state | P0 - highest | DONE. `collectNetworkState()` reads Performance API. Captures URL, type, duration, transferSize, failed flag. Sorted, capped at 100, URLs truncated. 13 tests. |
| 12.2 | Console errors/warnings | P0 - highest | DONE. `installConsoleInterceptor()` wraps console.error/warn. Captures message, stack, timestamp. Preserves originals. Capped at 50, truncated to 500 chars. 9 tests. |
| 12.3 | Component tree mapping | P1 - medium | Annotate DOM nodes with React/Vue/Svelte component names. React: `_reactFiber` on DOM nodes. Vue: `__vue_app__`. Map container divs to component names so agent can jump to source files. Framework-specific, needs detection. |
| 12.4 | Event listener inventory | P2 - lower | List event listeners per element via `getEventListeners()` (Chrome DevTools protocol only) or by intercepting `addEventListener`. Helps debug "click does nothing" issues. Complex to implement reliably. |
| 12.5 | CSS animation state | P2 - lower | Detect active CSS animations/transitions via `getAnimations()` API. Flag elements mid-animation. Low priority - rarely the root cause. |
| 12.6 | Responsive breakpoint context | P1 - medium | DONE. `collectBreakpoints()` reports active min-width/max-width for standard breakpoints (xs-2xl). Includes `activeRange` name. 5 tests. |

**Exit criteria:** Captures include network requests and console errors. Component
names annotated on container elements for React projects.

**Effort:** ~2 weeks (12.1 and 12.2 are ~3 days each, rest is incremental)

---

## Milestone 13: Browser-Computed State Enrichment (Future)

**Goal:** Capture browser-computed state that can't be inferred from DOM + styles
alone. These are the "code looks right but page is wrong" debuggers.

Source: Kiro IDE analysis session 2026-04-10. Prioritized by debugging leverage.

| # | Task | Priority | Details |
|---|---|---|---|
| 13.1 | Z-index stacking context resolution | P0 - highest | Walk the DOM to identify stacking context boundaries (elements with `position` + `z-index`, `opacity < 1`, `transform`, `filter`, etc.). Build resolved stacking order tree. Root cause of "dropdown behind modal" bugs. Can't be inferred from flat computed z-index values because stacking contexts are hierarchical. |
| 13.2 | Focus management chain | P0 - highest | Capture `document.activeElement`, compute tab order from `tabIndex` values + DOM position + visibility filtering. Identify focus trap boundaries (elements that intercept Tab/Shift+Tab). Debugs "can't tab to submit" and "focus stuck in modal". |
| 13.3 | isRendered ancestor walk | P0 - highest | DONE. `checkRendered(el)` walks ancestors for opacity:0, clip-path, off-screen. `isRendered` flag on every node. 7 tests. |
| 13.4 | Scroll containers | P1 - medium | Identify scrollable elements (`overflow: auto/scroll` with `scrollHeight > clientHeight`), capture `scrollTop`/`scrollLeft` and total scrollable area. Debugs "wrong thing scrolls" in nested scroll containers. |
| 13.5 | Media query matches | P1 - medium | Run `window.matchMedia()` against standard breakpoints (576, 768, 992, 1200, 1400px) and report which are active. Overlaps with M12.6 but adds actual `@media` rule matching, not just viewport width. |
| 13.6 | Semantic ARIA landmarks | P1 - medium | Extract resolved landmark tree (banner, navigation, main, complementary, contentinfo). Different from DOM tree - this is what screen readers actually navigate. Most pages have broken landmark structure. |
| 13.7 | Pending animations | P2 - lower | `element.getAnimations()` results: which property is animating, current progress, playback state. Debugs frozen spinners and incomplete transitions. Overlaps with M12.5. |
| 13.8 | Intersection observer state | P2 - lower | Which elements are currently intersecting the viewport via `IntersectionObserver`. Debugs lazy-load and infinite scroll failures. Complex - requires injecting an observer before capture. |

**Exit criteria:** Captures include stacking context tree, focus chain, and
isRendered flag. Agent can diagnose z-index layering, focus trapping, and
hidden-by-ancestor issues from capture data alone.

**Effort:** ~2-3 weeks (13.1-13.3 are ~2 days each, rest is incremental)

---

## Milestone 14: Real-Time Capture Pipeline (Future)

**Goal:** Eliminate manual capture steps. The extension watches for changes
and feeds the agent automatically.

Source: Kiro IDE analysis session 2026-04-10.

| # | Task | Priority | Details |
|---|---|---|---|
| 14.1 | Continuous capture on hot-reload | P0 - highest | Extension watches for DOM mutations via `MutationObserver`. On dev server hot-reload (detected via `beforeunload` + `load` or HMR events), auto-captures before/after and sends a diff to the agent. Eliminates the manual capture step entirely. Agent sees "3 elements shifted, 1 new element added, contrast dropped on heading" without anyone clicking anything. |
| 14.2 | User journey recording | P1 - medium | Record a sequence of captures as the user navigates (login -> dashboard -> settings). Each capture timestamped and linked to previous. Replay as a series of DOM states. Like Playwright trace viewer but for DOM structure. Extension tracks `navigation` and `click` events to auto-capture at each step. |
| 14.3 | Live annotation collaboration | P1 - medium | User annotates in browser, agent sees it in real-time via WebSocket push (not just after capture). User circles something, types "this is wrong", agent responds with proposed fix, user approves, agent applies, page hot-reloads, user verifies. Requires persistent WebSocket between extension and MCP server. |
| 14.4 | Intent-based capture | P2 - lower | User says "capture the broken dropdown" and draws a box. Extension captures just that subtree with full detail (all computed styles, not just high-salience) plus surrounding context (parent layout, sibling positions). Smaller payload, more focused data. Builds on existing region selection in annotate mode. |

**Exit criteria:** Hot-reload auto-capture works with Vite/webpack dev servers.
Agent receives diffs without manual intervention.

**Effort:** ~3-4 weeks (14.1 is ~1 week, 14.2-14.3 are ~1 week each)

---

## Milestone 15: Structural Intelligence (Future)

**Goal:** Cross-capture analysis for regression detection, consistency
enforcement, and source-to-DOM linking.

Source: Kiro IDE analysis session 2026-04-10.

| # | Task | Priority | Details |
|---|---|---|---|
| 15.1 | Bidirectional element linking | P0 - highest | When viewing `PulseCard.tsx` in editor, extension highlights corresponding DOM elements. When user clicks element in browser, MCP tells agent which source file and line rendered it. Start with heuristic: `data-testid` -> grep codebase. Enhance with React DevTools fiber walk for component name -> file mapping. Eliminates "which file renders this div" guessing. |
| 15.2 | Regression baseline library | P0 - highest | Save a "golden" capture per page. After code changes, auto-compare against baseline. Flag structural regressions: "ContactsPage had 12 interactive elements, now has 11 - Unlink button missing." Visual regression testing without screenshots - purely structural. Server stores baselines in `.viewgraph/baselines/`. New MCP tool: `compare_baseline`. |
| 15.3 | Cross-page consistency checker | P1 - medium | Capture the same component (e.g. page header) across N pages, flag inconsistencies. "RecipesPage header has 16px padding, ContactsPage has 24px." Uses structural pattern fingerprinting from SUMMARY clusters. Enforces design system consistency without manual review. |
| 15.4 | State machine visualization | P1 - medium | For pages with complex state (receipt: pending -> extracting -> parsed -> confirmed), capture each state and build a state diagram showing which elements appear/disappear/change at each transition. Verify UI matches backend state machine. Builds on journey recording (14.2). |
| 15.5 | Performance budget per component | P2 - lower | Capture includes render timing per subtree via `PerformanceObserver` + `element-timing` API. "This card took 200ms, this list took 800ms." Identifies component bottlenecks without profiling tools. Requires `elementtiming` attribute injection. |

**Exit criteria:** Bidirectional linking works for React projects with data-testid.
Baseline comparison detects missing/added interactive elements.

**Effort:** ~4-6 weeks (15.1-15.2 are ~1.5 weeks each, rest is incremental)

---

## Timeline Summary

| Week | Milestones | Key Deliverable |
|---|---|---|
| Week 1 | M0 + M1 | MCP server reads captures, Kiro can query |
| Week 2 | M2 + M3 | Analysis tools + bidirectional communication |
| Week 3 | M4 (start) | Extension core: capture + screenshot + push |
| Week 4 | M4 (finish) + M5 | Inspector + select element mode |
| Week 5 | M6 | Review mode + annotations |
| Week 6 | M7 + M8 | Deployment + universal agent integration |
| Ongoing | M9 | Advanced tools + polish |

---

## Future: Product and GTM

See [product-positioning.md](./product-positioning.md) for positioning,
messaging, audience strategy, content plan, and launch narrative. To be
executed when the product is demo-ready.

See [problem-feature-mapping.md](./problem-feature-mapping.md) for how each
core problem (weak tests, brittle selectors, missed regressions, vague QA
handoffs, bad a11y fixes, poor layout reproduction, hallucinated UI) maps
to specific ViewGraph features, tools, workflows, and remaining gaps.

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| `captureVisibleTab` broken in Firefox MV3 | Screenshot feature unusable on Firefox | Develop Chrome-first, use Firefox Developer Edition for testing, track Bugzilla bug |
| AMO review delays | Firefox release blocked for days/weeks | Submit early, keep code size small, avoid flagged patterns |
| Service worker termination during capture | Capture interrupted mid-scroll-stitch | Save progress to `chrome.storage` after each slice, resume on restart |
| Large captures exceed MCP context window | Kiro can't process full capture | Already mitigated: summary tools, response size caps, progressive disclosure |
| WSL file watcher unreliability | Server misses new captures | Use `chokidar` with polling fallback, not raw `fs.watch` |
