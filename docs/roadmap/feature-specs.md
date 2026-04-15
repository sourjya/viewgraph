# ViewGraph Feature Specs - Post-Beta Roadmap

Organized by priority tier. Each feature has scope, UX design, trigger mechanism, and dependencies.

---

## Tier 1: Build Now

### F1: Help Overlay + Keyboard Shortcuts Page

**Problem:** Keyboard shortcuts are wired but undiscoverable. No in-app help.

**UX:**
- Add a `?` icon button in the sidebar header (between collapse chevron and close X)
- Click opens a card overlay inside the sidebar (not a modal - doesn't block the page)
- Card shows:
  - Keyboard shortcuts table (Escape, Ctrl+Enter, Ctrl+Shift+C, 1/2/3, Delete)
  - Link: "Full documentation" -> GitBook
  - Link: "Keyboard shortcuts" -> GitBook shortcuts page
  - Link: "Report a bug" -> GitHub issues
- Click outside or press Escape to dismiss
- Card has dark theme matching sidebar

**GitBook:**
- New page: `gitbook/reference/keyboard-shortcuts.md`
- Add to SUMMARY.md under Reference section
- Content: full shortcut table, context (when active), customization notes (none yet)

**Files to change:**
- `extension/lib/annotation-sidebar.js` - add `?` button and overlay
- `gitbook/reference/keyboard-shortcuts.md` - new page
- `gitbook/SUMMARY.md` - add nav entry

**Dependencies:** None
**Effort:** Small (1-2 hours)

---

## Tier 2: Spec and Build Next Sprint

### F2: Project Config (`config.json`)

**Problem:** Extension settings have no project-scoped persistence. Settings like auto-audit, baseline preferences, and feature flags need to survive across sessions and be shared with the team (via git).

**UX:**
- `viewgraph-init` creates `.viewgraph/config.json` with defaults
- Server exposes `GET /config` and `PUT /config` endpoints
- Extension reads config on sidebar open, caches in `chrome.storage.local`
- Extension writes to server on toggle changes, server writes to disk
- On next session, extension fetches fresh config from server on connect

**Schema:**
```json
{
  "version": 1,
  "autoAudit": false,
  "baselineAutoCompare": false,
  "smartSuggestions": false,
  "captureTimeline": true
}
```

**Files to change:**
- `scripts/viewgraph-init.js` - create config.json with defaults
- `server/src/http-receiver.js` - GET/PUT /config endpoints
- `extension/lib/constants.js` - `fetchConfig()` / `updateConfig()` helpers
- `extension/lib/annotation-sidebar.js` - read config on create, write on toggle

**Dependencies:** None (foundational - other features depend on this)
**Effort:** Medium (3-4 hours)

### F3: Auto-Audit on Capture

**Problem:** Users must manually ask the agent to audit. Proactive feedback would catch issues immediately.

**UX:**
- Toggle in Inspect tab: "Auto-audit captures" (reads from config.json, off by default)
- When on: server runs audit_accessibility + audit_layout + find_missing_testids after each capture
- Results pushed via WS to extension
- Extension shows summary badge in Inspect tab: "3 a11y, 1 layout, 2 testids"
- Click badge to expand details inline
- Toggle writes to `.viewgraph/config.json` via server

**Trigger:** Automatic on capture receipt (server-side post-capture hook)

**Files to change:**
- `server/src/http-receiver.js` - post-capture hook calling audit tools
- `server/src/ws-server.js` - new message type `audit:results`
- `extension/lib/annotation-sidebar.js` - audit badge in Inspect tab, WS handler
- `.viewgraph/config.json` - `autoAudit` flag

**Dependencies:** F2 (config.json)
**Effort:** Medium (4-5 hours)

### F4: Baseline Management UI

**Problem:** Baselines exist as MCP tools but have no extension UI. Users can't see, set, or compare baselines from the sidebar.

**UX:**
- In Inspect tab, below captures section:
  - "Baseline: none set" or "Baseline: viewgraph-...-0408.json (Apr 8)"
  - "Set current as baseline" button (calls server endpoint)
  - "Compare with baseline" button (shows diff summary inline)
  - Diff summary: "+3 elements, -1 element, 2 moved, 1 testid changed"
- Auto-compare on new capture (if `baselineAutoCompare` is true in config)

**Trigger:** Manual (set/compare buttons) + optional auto on capture

**Files to change:**
- `server/src/http-receiver.js` - expose baseline endpoints for extension
- `extension/lib/annotation-sidebar.js` - baseline section in Inspect tab

**Dependencies:** F2 (config.json for auto-compare flag)
**Effort:** Medium-Large (5-6 hours)

### F5: Smart Suggestions + Annotation Templates

**Problem:** Users type annotations from scratch. The extension already has enrichment data that could pre-populate suggestions.

**UX:**
- When user selects an element, the annotation panel shows:
  - Comment textarea (existing)
  - "Suggestions" row of clickable chips (new, below textarea)
  - Chips are context-aware based on enrichment data for the selected element:
    - No `aria-label` on interactive element -> chip: "Missing aria-label"
    - Console error referencing this element -> chip: "Console: TypeError..."
    - Low contrast ratio -> chip: "Low contrast (2.1:1)"
    - No `data-testid` -> chip: "Missing data-testid"
  - Generic chips always available: "Layout issue", "Visual bug", "Broken behavior"
  - Click chip -> populates comment textarea with the suggestion text
  - User can edit before saving
- Toggle in config: `smartSuggestions` (off by default)

**Trigger:** Automatic when element is selected (if enabled)

**Files to change:**
- `extension/lib/annotation-panel.js` - add suggestions row
- `extension/lib/annotate.js` - pass enrichment data to panel
- Various collectors - expose per-element issue lookup

**Dependencies:** F2 (config.json for toggle)
**Effort:** Large (6-8 hours)

---

## Tier 3: Design Later

### F6: Capture Timeline

**Problem:** Inspect tab shows flat "Captures: 3" with no history or diff context.

**UX:**
- Vertical mini-timeline in Inspect tab replacing current captures line
- Each capture is a dot on a vertical line with timestamp
- Diff indicators between dots: "+2 elements, -1"
- Click a dot to see that capture's summary
- Most recent at top, scrollable

**Trigger:** Automatic (renders on Inspect tab open)
**Dependencies:** F4 (baseline UI - shares diff infrastructure)
**Effort:** Medium (4-5 hours)

### F7: CSS Diff Tool

**Problem:** `compare_captures` diffs structure but not styles. "What changed about this button?" has no answer.

**UX:**
- New MCP tool: `compare_styles(file_a, file_b, element_id)`
- Returns table of changed CSS properties with before/after values
- Agent-only (no extension UI needed)

**Trigger:** Agent calls it when user asks about style changes
**Dependencies:** None
**Effort:** Medium (3-4 hours)

### F8: Component Coverage Report

**Problem:** No way to see which React/Vue components lack testids on their interactive children.

**UX:**
- New MCP tool: `get_component_coverage(filename)`
- Returns components with coverage stats: total interactive elements, elements with testid, coverage %
- Agent surfaces when user asks "which components need testids?"

**Trigger:** Agent calls it
**Dependencies:** None
**Effort:** Small (2-3 hours)

### F9: Cross-Page Consistency (Extension Surface)

**Problem:** `check_consistency` MCP tool exists but isn't surfaced in the extension.

**UX:**
- Button in Inspect tab: "Check consistency" (only visible when 2+ captures exist)
- Calls server endpoint, shows results inline: "btn-primary: blue on /login, purple on /settings"
- Links to specific captures for each inconsistency

**Trigger:** Manual button click
**Dependencies:** F6 (capture timeline - shares capture list UI)
**Effort:** Medium (3-4 hours)

### F10: Live DOM Watcher with Smart Alerts

**Problem:** Continuous capture watches mutations but doesn't analyze them.

**UX:**
- When continuous capture is on, run lightweight checks on each mutation batch:
  - Did any `aria-label` disappear?
  - Did a new console error fire?
  - Did a z-index conflict appear?
- Show alerts as toast notifications in the sidebar
- "Quiet mode" (default): only alert on regressions (was fine, now broken)
- "Verbose mode": alert on all new issues

**Trigger:** Automatic during continuous capture
**Dependencies:** F2 (config.json), F3 (auto-audit infrastructure)
**Effort:** Large (8-10 hours)

---

## Implementation Order

```
F1 (help overlay)          <- build now, no dependencies
F2 (config.json)           <- build next, foundational
F3 (auto-audit)            <- depends on F2
F4 (baseline UI)           <- depends on F2
F5 (smart suggestions)     <- depends on F2
F6 (capture timeline)      <- depends on F4
F7 (CSS diff tool)         <- independent, agent-only
F8 (component coverage)    <- independent, agent-only
F9 (consistency surface)   <- depends on F6
F10 (live DOM watcher)     <- depends on F2, F3
```

GitBook updates needed for: F1 (shortcuts page), F3 (auto-audit guide), F4 (baselines guide), F5 (suggestions guide).

---

## Tier 4: Future Ideas

### F11: Remote MCP Server Mode

**Problem:** Cloud IDE users (Codespaces, Gitpod) can't connect the extension to the server without port forwarding. Teams may want a shared review server.

**UX:**
- Opt-in "Remote Mode" in extension settings: server URL + API key
- `viewgraph-init --remote` generates API key, enables auth on server
- Extension sends `Authorization: Bearer <key>` with every request
- HTTPS required for remote connections (reject plain HTTP)
- Default remains local-only - privacy promise unchanged

**Auth:** API key (stateless, no sessions). Key stored in chrome.storage.local. Rate limiting on auth failures. Key rotation via `viewgraph-init --rotate-key`.

**Dependencies:** Re-enable ADR-010 auth (gated behind `remote: true` config flag)
**Effort:** Small (2-3 hours - infrastructure was built and removed)

### F12: Ideation Pipeline - Annotations to Feature Specs

**Problem:** ViewGraph annotations assume bugs. But users also stare at screens and think "this needs a new feature." There's no pipeline from UI-context ideation to structured feature specs.

**UX:**
- New `idea` category in annotation panel (alongside visual, functional, content, a11y, perf)
- Page notes with `idea` category treated as feature requests, not bugs
- `generate_spec` tool detects `idea` annotations and generates feature specs (requirements + user stories) instead of bug-fix tasks
- New `@vg-ideate` prompt shortcut: reads idea annotations with full DOM context, generates Kiro feature spec

**Pipeline:**
1. Open app, click ViewGraph
2. Select elements or use Page mode, write feature ideas as comments
3. Set category to `idea`
4. Send to Agent
5. `@vg-ideate` generates requirements.md with user stories, acceptance criteria, and UI context from the capture

**Files to change:**
- `extension/lib/annotation-panel.js` - add `idea` to CAT_OPTIONS
- `server/src/analysis/spec-generator.js` - detect idea annotations, generate feature spec format
- `power/prompts/vg-ideate.md` - new prompt shortcut
- `.kiro/prompts/vg-ideate.md` - copy for Kiro Power

**Dependencies:** None
**Effort:** Small (1-2 hours)

### F13: Annotation Type Filtering + Visual Differentiation

**Problem:** The sidebar mixes bugs, ideas, and diagnostic notes in one list. As annotation count grows, users can't quickly find what they're looking for. No way to see "just my ideas" or "just the diagnostic errors."

**Annotation types:**
1. **Bug** (default) - regular element/region annotations with severity. Icon: colored `#N` badge.
2. **Idea** - feature ideas with lightbulb. Icon: yellow `#N 💡` badge.
3. **Diagnostic** - notes created from Inspect tab sections. Icon: `#N` with blue `[Network]`/`[Console]` tag.
4. **Page note** - general page-level notes. Icon: `#N` with document icon, blue badge.

**UX - Filter bar:**
```
Open (3)  Resolved (1)  All (4)        ← status filter (existing)
[🐛] [💡] [📋] [📄]                    ← type toggles (new)
```
- Type toggles are icon buttons below the status tabs
- All active by default (show everything)
- Click to toggle off/on - dimmed when off
- Multiple can be active simultaneously
- Count in status tabs updates to reflect active type filters
- Persisted in chrome.storage.local per session

**UX - Idea mode suggestions:**
- When idea category is active, suppress diagnostic suggestions (no testid, missing aria-label, low contrast)
- Only show structural context hints if any

**UX - Diagnostic notes in list:**
- Blue section tag pill (`[Network]`, `[Console]`) already implemented
- Truncated excerpt with expand chevron already implemented

**Files to change:**
- `extension/lib/annotation-sidebar.js` - filter toggle row, filter logic in refresh(), count updates
- `extension/tests/unit/annotation-sidebar.test.js` - filter toggle tests
- `extension/lib/annotation-panel.js` - suppress diagnostic suggestions in idea mode
- `gitbook/features/extension.md` - document filtering

**Dependencies:** None
**Effort:** Medium (3-4 hours)
