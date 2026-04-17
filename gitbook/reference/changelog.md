# Changelog

{% hint style="info" %}
User-facing changes only. For the full engineering changelog, see [GitHub](https://github.com/sourjya/viewgraph/blob/main/docs/changelogs/CHANGELOG.md). Extension ZIPs and release notes on [GitHub Releases](https://github.com/sourjya/viewgraph/releases).
{% endhint %}

---

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
