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
**Status:** Not Started

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

## Milestone 8: Universal Agent Integration (Days 28-30)

**Goal:** Plug-and-play support for all major agentic coding tools.

**ADR:** [`docs/decisions/ADR-001-universal-agent-integration.md`](../decisions/ADR-001-universal-agent-integration.md)
**Spec:** `.kiro/specs/universal-integration/`

| # | Task | Details |
|---|---|---|
| 8.1 | Registration CLI | `npx viewgraph init` - auto-detect tool, write MCP config |
| 8.2 | Tool detection | Detect Kiro, Claude Code, Cursor, Windsurf, Cline by config directory presence |
| 8.3 | Streamable HTTP transport | `--transport http --port 9091` flag for remote/team scenarios |
| 8.4 | npm package setup | `package.json` bin entry, publish as `viewgraph-mcp-server` |
| 8.5 | Setup runbooks | Per-tool setup guides in `docs/runbooks/` (kiro, claude-code, cursor, windsurf) |
| 8.6 | Health check CLI | `npx viewgraph doctor` - verify server starts, tools register, captures dir accessible |
| 8.7 | Integration tests | Test stdio + HTTP transports, test init command for each tool |

**Exit criteria:** `npx viewgraph init` works for Kiro, Claude Code, Cursor,
and Windsurf. Server works over both stdio and HTTP transports. npm package
installable globally.

**Effort:** 2-3 days

---

## Milestone 9: Advanced Tools + Polish (Days 31+)

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
