# Web Store Descriptions

Canonical store descriptions. Update this file on every release, then copy to Chrome Web Store and Firefox Add-ons.

Last updated: v0.9.2 (2026-04-29)

---

## Chrome Web Store - Detailed Description

ViewGraph is the UI context layer for AI coding agents. When you see a bug in the browser, click it, describe what's wrong, and send it to your agent. The agent receives the element's exact CSS selector, computed styles, accessibility state, and your comment - then finds the source file and fixes the code.

Features:
- Click any element to annotate with comments, severity, and category
- Shift+drag to select a region
- Panic capture (Ctrl+Shift+V): instant DOM + screenshot snapshot mid-action, without opening the sidebar
- Live annotation status: see real-time progress as your agent works (queued -> fixing -> resolved)
- Idea mode: toggle the lightbulb to switch from bug reporting to feature ideation
- Smart suggestions: clickable chips for detected issues (missing aria-label, no testid, low contrast)
- Keyboard shortcuts: Ctrl+Enter (send), Ctrl+Shift+C (copy), 1/2/3 (severity), Esc (close)
- 21 enrichment collectors: network, console, accessibility, layout, components, client storage, transient state, error boundaries, service worker state, build metadata, and more
- Page Activity: captures toasts, flash content, animation jank, and render thrashing automatically
- Built-in diagnostics: copy or create notes from any section - no DevTools needed
- Auto-audit: automatically runs a11y, layout, and testid audits after each capture
- Three export modes: Send to Agent (MCP), Copy Markdown (Jira/GitHub), Download ZIP report
- HMAC-signed communication: secure connection between extension and server
- Baseline management: set and compare structural baselines from the sidebar
- Multi-project support with automatic URL routing (up to 4 simultaneous projects)
- Session recording for multi-step user journeys
- HTML snapshots and screenshots saved alongside captures
- Works with Kiro, Claude Code, Cursor, Windsurf, Cline, and any MCP-compatible agent
- 41 MCP tools for querying, auditing, diffing, and generating specs

NEW IN v0.9:
- v3 format: Action Manifest with pre-indexed interactive elements and short refs (@e1-@eN) - 80-85% fewer tokens for interactive queries
- 64% smaller content script: axe-core loaded on demand instead of bundled (856KB -> 305KB)
- Container merging: semantically empty wrapper divs removed at capture time (30-50% fewer nodes)
- observationDepth: request only interactive elements (~400 tokens) instead of full capture (~100K)
- Structural fingerprint: topology hash for cache-hit detection between captures
- Spatial index: O(log n) element queries by coordinate
- Performance instrumentation: capture timings (traverse, enrich, serialize) in every snapshot
- TracePulse integration: frontend errors bridged to backend monitoring
- Welcome page on first install
- verify_fix: one-call smoke test replaces 3-4 separate tool calls
- Uninstall CLI: npx @viewgraph/core uninstall

NO AGENT REQUIRED
Testers and reviewers can use ViewGraph standalone. Annotate issues, copy as Markdown for Jira/GitHub, or download a ZIP report with screenshots. No MCP server needed.

PRIVACY
- Runs entirely on localhost - no data leaves your machine
- No analytics, no tracking, no external services
- Captures stored locally in your project's .viewgraph/ directory
- Open source (AGPL-3.0): https://github.com/sourjya/viewgraph

SETUP
Add to your agent's MCP config:
{ "command": "npx", "args": ["-y", "@viewgraph/core"] }

Quick Start: https://chaoslabz.gitbook.io/viewgraph/getting-started/quick-start

---

## Chrome Web Store - Short Description (132 chars)

The UI context layer for AI coding agents. Annotate UI bugs, send to your agent with full DOM context. 41 MCP tools.

---

## Firefox Add-ons - Summary (250 chars)

The UI context layer for AI coding agents. Click elements, describe bugs, send to your AI assistant with full DOM context, computed styles, and 21 enrichment collectors. Works with Kiro, Claude Code, Cursor.

## Firefox Add-ons - Description

(Same as Chrome Web Store detailed description above)

---

## Firefox Add-ons - Release Notes Template

### v0.9.2
- v3 format complete: Action Manifest, short refs, structural fingerprint, spatial index, Set-of-Marks, checkpoint/resume
- 64% smaller content script (axe-core lazy loaded)
- Container merging (30-50% fewer nodes)
- observationDepth parameter (interactive-only: ~400 tokens)
- TOON compact format (~87% fewer tokens)
- Performance instrumentation in every capture
- TracePulse integration for frontend-backend error correlation
- Security: path validation, PII redaction expanded, timing data privacy fix
- Welcome page on first install

---

## Firefox Add-ons - Notes for Reviewer Template

What this extension does:
Developer tool that captures structured DOM snapshots and sends them to AI coding assistants via the Model Context Protocol (MCP). Used by developers to annotate UI bugs and send them to AI agents for fixing.

Permissions:
- activeTab: Capture DOM of current tab when user clicks the toolbar icon
- storage: User preferences (auto-capture, collapse state) and annotation data
- scripting: Content script injection for DOM traversal and annotation overlays
- alarms: Background sync polling for resolved annotations (every 5 min)
- host_permissions (all_urls): Captures DOM from any page the developer works on. Only activates on toolbar icon click - no background scanning.

Key technical notes:
- axe-core (v4.11.2) loaded from public/axe.min.js via script injection into page main world. Shipped with extension, not fetched from CDN.
- web_accessible_resources includes axe.min.js and icon files.
- No remote code. All JS bundled. No CDN, no eval(), no external dynamic loading.
- No data collection. No telemetry, no analytics. All data stays in local .viewgraph/ directory.

Source: https://github.com/sourjya/viewgraph (AGPL-3.0)

Test steps:
1. Install, open any web page
2. Click ViewGraph icon in toolbar - sidebar opens
3. Click an element on the page - annotation marker appears
4. Type a comment in the panel
5. Click "Copy MD" to export as markdown (no MCP server needed)
