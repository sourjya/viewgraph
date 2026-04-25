# Changelog

{% hint style="info" %}
User-facing changes only. For the full engineering changelog, see [GitHub](https://github.com/sourjya/viewgraph/blob/main/docs/changelogs/CHANGELOG.md). Extension ZIPs and release notes on [GitHub Releases](https://github.com/sourjya/viewgraph/releases).
{% endhint %}

---

## Unreleased

### Known Issues Documented
- BUG-023: Resolved annotation reopens on same element click, blocking follow-up notes
- BUG-024: Collapsed strip not repositionable - elements hidden underneath cannot be annotated

### Bug Fixes
- BUG-025: Annotation panel textarea scrollbar now uses dark theme
- BUG-026: Auto-capture toggle now persists across page reloads
- BUG-027: Accepted capture requests now show in Resolved tab with smooth collapse animation

---

## v0.4.3 - April 21, 2026

### Features
- F20: Transient UI State Capture - "Page Activity" section in Inspect tab. Captures toasts, flash content, animation jank, render thrashing via 30s mutation buffer. 17 enrichment collectors total.
- ADR-013 Phase 2: All servers list inline in sidebar settings
- Reload hint after agent resolves issues ("Reload to verify" with button)
- Comparison page: Cursor Browser + Antigravity + 7 competitors in tabbed layout
- Architecture SVG diagram on landing page

### Bug Fixes
- BUG-022 (Critical): request_capture matches by requestId, not just URL
- Ghost border lines in footer removed
- Settings link restored on back button click
- Export buttons hidden in settings view
- Flaky continuous-capture test fixed with fake timers

### Security
- F21: HMAC-signed localhost auth - session key, challenge-response handshake, signed requests (31 auth tests)
- SRR-004: Tier 3 full codebase review - S1-3 native messaging config whitelist fixed
- S7-8 HIGH resolved: F19 wrapping gaps closed on all tools + standardized notice constants
- STRIDE threat model: 9 threats, 9 mitigations, Threat Composer JSON export
- Transport centralization: all server communication via transport.js/discovery.js
- 0 open HIGH findings

### Codebase
- addHover() helper consolidates 12 hover listener pairs
- getSelector() extracted to collector-utils.js
- 4 standardized F19 notice constants in tool-helpers.js
- 1583 tests (1099 extension + 484 server)

---

## v0.4.1 - April 19, 2026

### UI Polish
- ADR-012: status indicators (connection dot, trust shield) moved from header to footer
- Help card redesign: version info with highlighted pills, collapse chevron, links below version
- Suggestion `+` button with shaded background (replaces text "Add")
- Filter label added to type filter icon row
- Trust shield tooltip capitalization (Trusted/Untrusted/Configured)
- Esc key collapses expanded suggestions bar
- F20: Transient UI State Capture - new collector (17 total) captures toasts, flash content, animation jank, render thrashing via 30s mutation buffer

### Bug Fixes
- BUG-015: auto-learn URL patterns when config exists but patterns empty
- BUG-016: `npx viewgraph-init` 404 - updated all docs to use `npm install -g`
- BUG-017: sidebar vanishes on Element click - re-append guard for DOM cleanup
- BUG-018: settings showed wrong server for unmatched pages
- BUG-019: suggestions panel stays open when adding individual items
- Annotation count now reported correctly in `get_session_status`

### Security (SRR-002)
- S3-2 HIGH: auto-learn merges config instead of overwriting user keys
- S5-4 MEDIUM: URL matching uses hostname+port, not String.includes()
- S5-5 LOW: suggestions-ui state cleared on destroy

### Documentation
- Gitbook landing page, why-viewgraph, who-benefits, extension features, MCP tools rewritten
- GitHub Releases callouts added across all user-facing pages
- Privacy policy updated for storage collector and CSS custom properties
- All install instructions updated for `npm install -g` flow

---

## v0.4.0 - April 18, 2026

### Security
- SRR-001 security fixes: config schema validation, shadow DOM closed mode, WebSocket limits, security headers, error sanitization
- F19 prompt injection defense complete: 5-layer defense (capture sanitization, transport wrapping, suspicious detection, prompt hardening, trust gate)
- 16 CodeQL alerts resolved: path validation, URL parsing, crypto.randomUUID, CI permissions
- 3-tier security review system: pre-commit, feature-complete, sprint-end hooks

### Features
- Server lifecycle management: stdin close detection + 30-min idle timeout prevents orphaned processes
- F18 fuzzy filename matching: "did you mean" suggestions on typos
- F10 smart alerts: regression detection in post-capture auto-audit
- Themed tooltip component on all sidebar buttons
- M16 sidebar polish complete: keyboard nav, incremental tabs, strip active state, empty state, collapse toast
- F17 URL trust indicator complete: SPA reclassification
- 2 new enrichment collectors (16 total): client-side storage + CSS custom properties

### Codebase
- Phase 2 refactors: 74 files - jsonResponse/errorResponse, readAndParse/Pair/Multi, shared test fixtures, mockChrome, styles.js COLOR constants
- Test split: annotation-sidebar.test.js (1366 lines) to 7 focused files
- 1538 tests (470 server + 1068 extension)

## v0.3.7 - April 17, 2026

- **Capture timeline (F6)** - collapsible list of all captures in the Inspect tab with timestamps and green dot for latest.
- **Cross-page consistency (F9)** - when 2+ pages are captured, a "Compare" button copies an agent prompt to check for style differences across pages.
- **Transport abstraction (F11)** - all extension-server communication now goes through `transport.js`. Native messaging, HTTP, and WebSocket unified behind one API. No more direct `fetch()` calls in sidebar modules.

## v0.3.6 - April 17, 2026

- **URL trust indicator (F17)** - shield icon with check/x mark in sidebar header. Green (trusted localhost), blue (configured pattern), amber (untrusted remote). Send to Agent blocked for untrusted URLs with "Add to trusted" or "Send anyway" options.
- **Auto-inspect suggestions (F15)** - collapsed badge expands to checklist with tier tags (A11Y, QUAL, TEST). Add individual suggestions to review list or batch add all. Suggestions become editable annotations.
- **Prompt injection defense (F19)** - 5-layer defense: capture sanitization, `[CAPTURED_TEXT]` delimiters, suspicious pattern detection, prompt hardening, trust gate.
- **MCP agent guidance (F18)** - SERVER_INSTRUCTIONS with workflow/security/performance. `get_session_status` tool (37th). Workflow-aware tool descriptions. Filename suggestions on not-found errors.
- **Transport auto-detection (F16)** - server detects stdio (MCP client) vs TTY (manual) and adapts.
- **1,401 tests** (990 extension + 411 server)

## v0.3.5 - April 17, 2026

- **Auto-inspect suggestions (F15)** - ViewGraph now scans pages automatically and presents a ranked checklist of issues: missing alt text, failed network requests, unlabeled inputs, missing testids. Select which ones to fix and send to your agent in one click.
- **Prompt injection defense (F19)** - 5-layer protection: HTML comments stripped, hidden text cleared, text wrapped in `[CAPTURED_TEXT]` delimiters, suspicious patterns flagged, untrusted URLs blocked from agent.
- **URL trust indicator (F17)** - shield icon with check/x mark shows trust level: green (trusted localhost), blue (configured pattern), amber (untrusted remote). Send to Agent blocked for untrusted URLs - add to trusted list or override.
- **MCP agent guidance (F18)** - server instructions with workflow + security warnings on connection. New `get_session_status` tool (37th) gives agents capture/annotation/baseline counts with actionable suggestions.
- **Zero-config install** - add 5 lines of MCP config JSON and the server runs via `npx`. No install commands needed.
- **STRIDE threat model** - 8 threats identified and mitigated. Published on the [Threat Model](threat-model.md) page.
- **1,388 tests**, pre-built extension ZIPs available for [direct download](https://github.com/sourjya/viewgraph/tree/main/downloads)

## v0.3.4 - April 16, 2026

- **Chrome Web Store and Firefox Add-ons approved** - install directly from the browser stores
- **Security fix:** remote URLs no longer accidentally route to local MCP servers. Only localhost and file:// URLs auto-match.
- **npm published** - `npm install -g @viewgraph/core` and `@viewgraph/playwright` both at 0.3.4

## v0.3.3 - April 16, 2026

- **Annotation type filters** - toggle visibility of bugs, ideas, diagnostics, and notes in the sidebar
- **Event bus architecture** - sidebar modules communicate via events instead of direct coupling (faster, more reliable)
- **Firefox compatibility** - extension rebuilt for Firefox Manifest V3 with WXT framework
- **Node 22+ required** - dropped Node 18/20 support for modern ES module features

## v0.3.2 - April 14, 2026

- **Idea mode** - annotate what to build, not just what's broken. Ideas get a lightbulb icon and yellow badge.
- **Diagnostic notes** - click the sparkle icon on any Inspect section to attach it as a note for the agent
- **Type badges** - each annotation type (bug, idea, diagnostic, note) gets a distinct icon in the timeline
- **7 bug fixes** including escape key handling, diagnostic persistence, and clear annotations safety

## v0.3.1 - April 13, 2026

- **Ideation pipeline** - use `@vg-ideate` to turn UI annotations into structured feature specs
- **Idea category** - annotations can be categorized as ideas (separate from bugs)

## v0.3.0 - April 12, 2026

- **Auto-audit** - accessibility, layout, and testid audits run automatically after each capture
- **CSS style diff** - `compare_styles` MCP tool diffs computed CSS between two captures
- **Component coverage** - `get_component_coverage` reports testid coverage per framework component
- **Project config** - `config.json` with GET/PUT endpoints for server-side settings
- **Keyboard shortcuts** - full shortcut system with help overlay (press `?`)
- **37 MCP tools** total

## v0.2.0 - April 10, 2026

- **Annotation sidebar** - click elements or shift+drag regions, add comments, set severity
- **Multi-export** - Send to Agent (MCP), Copy Markdown (Jira/GitHub), Download Report (ZIP)
- **14 enrichment collectors** - network, console, landmarks, stacking, focus, scroll, breakpoints, components, and more
- **Session recording** - record multi-page flows with step notes
- **Baseline management** - set and compare captures against golden baselines

## v0.1.0 - April 8, 2026

- **Initial release** - DOM capture, MCP server, browser extension
- **Capture format v2** - structured JSON with nodes, relations, details, summary
- **9 prompt shortcuts** - `@vg-review`, `@vg-audit`, `@vg-a11y`, `@vg-tests`, and more
- **Playwright fixture** - `@viewgraph/playwright` for capturing during E2E tests
