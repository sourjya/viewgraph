# Changelog

What's new in ViewGraph. User-facing changes only - for the full engineering changelog, see [GitHub](https://github.com/sourjya/viewgraph/blob/main/docs/changelogs/CHANGELOG.md).

---

## v0.3.5 - April 17, 2026

- **Zero-config install** - add 5 lines of MCP config JSON and the server runs automatically via `npx`. No `npm install`, no `viewgraph-init` needed. Server auto-creates directories and learns your URL pattern from the first capture.
- **innerHTML eliminated** - all SVG icons now use DOM API (createElementNS) instead of innerHTML. Reduces XSS surface and satisfies Firefox store review requirements.
- **Sidebar decomposition complete** - annotation-sidebar.js reduced from 2,306 to 747 lines (68% smaller). 10 focused modules with clean interfaces.
- **1,279 tests** (895 extension + 384 server), 75.1% statement coverage
- **Security comparison matrix** added to docs - compares zero-config, npm install, and build-from-source across 10 security dimensions

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
- **36 MCP tools** total

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
