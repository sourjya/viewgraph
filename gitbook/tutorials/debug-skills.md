# Debug with Recipe Skills

ViewGraph includes two debug recipe skills that guide your AI agent through structured debugging sequences. Instead of the agent improvising, it follows a tested step-by-step recipe.

## Prerequisites

- ViewGraph extension installed and connected (green dot in sidebar)
- MCP server running (`viewgraph-init` from your project)
- An AI agent (Kiro, Claude Code, Cursor, etc.)

## @vg-debug-ui - Fix UI Issues

Use this when something looks wrong on the page and you want the agent to find and fix it systematically.

### How to use it

Tell your agent:

```
@vg-debug-ui
```

Or describe the problem naturally:

```
The page looks broken. Use @vg-debug-ui to investigate.
```

### What the agent does

The agent follows five steps in order. Each step builds on the previous one.

**Step 1: Assess the current state**

The agent calls `list_captures` to find recent captures. If none exist, it asks you to capture the page. Then it calls `get_page_summary` to check for console errors and network failures.

If there are console errors or failed network requests, the agent investigates those first. A JavaScript error is often the root cause of a visual bug.

**Step 2: Check for your feedback**

The agent calls `get_unresolved` to find any annotations you left in the sidebar. If you annotated specific elements, the agent prioritizes those by severity - critical issues first, then major, then minor.

If you didn't annotate anything, the agent moves to automated audits.

**Step 3: Run automated audits**

The agent runs three audits in parallel:

- `audit_accessibility` - checks for WCAG violations, missing labels, contrast issues
- `audit_layout` - checks for elements overflowing their containers or overlapping
- `find_missing_testids` - checks for interactive elements without data-testid attributes

The agent prioritizes: accessibility violations first (they affect usability), then layout issues, then missing testids.

**Step 4: Locate and fix each issue**

For each issue found, the agent:

1. Calls `find_source` to locate the source file that renders the broken element
2. Reads the source file
3. Makes the minimal fix needed
4. If the issue came from an annotation, calls `resolve_annotation` to mark it done

**Step 5: Verify the fix**

The agent calls `request_capture` to ask you for a fresh capture. When you capture, it calls `compare_captures` to diff the before and after. It also runs `audit_accessibility` on the new capture to confirm no regressions.

The agent reports a summary table:

| Issue | Fix Applied | Verified |
|---|---|---|
| Missing alt text on hero image | Added alt="Product screenshot" | Yes - audit clean |
| Button overflows container | Changed width from 120% to 100% | Yes - no overflow |

### Decision tree

The agent follows this priority order:

1. Console errors? Fix JavaScript errors first - they cause UI bugs
2. Network failures? Check if the UI bug is caused by missing data
3. User annotations? Fix what you explicitly marked
4. Accessibility violations? Fix WCAG issues
5. Layout issues? Fix overflow and overlap
6. Everything clean? Report "no issues found"

---

## @vg-debug-fullstack - Debug Across the Stack

Use this when a problem might span the frontend and backend - for example, a form submission that fails, or data that doesn't appear on the page.

### How to use it

Tell your agent:

```
@vg-debug-fullstack
```

Or describe the cross-stack problem:

```
The form submits but nothing happens. Use @vg-debug-fullstack to check both sides.
```

### What the agent does

The agent checks which tools are available and adapts. It doesn't assume you have all three tools installed.

**Step 0: Detect available tools**

The agent checks its tool list for:

- **ViewGraph tools** (always available) - DOM state, accessibility, layout, annotations
- **Chrome DevTools MCP tools** (if installed) - live console errors, network requests, performance
- **[TracePulse](https://chaoslabz.gitbook.io/tracepulse) tools** (if installed) - backend server logs, build errors

The agent uses whatever is available and skips steps for tools that aren't installed.

**Step 1: Check the backend first**

If TracePulse is available, the agent calls `get_errors` to check for server-side errors. Backend errors are the fastest signal - if the server is crashing, that explains the frontend bug.

If TracePulse is not available, the agent skips to Step 2.

**Step 2: Check the browser**

If Chrome DevTools MCP is available, the agent:

1. Calls `list_console_messages` to check for JavaScript errors
2. Calls `list_network_requests` to find failed API calls (4xx, 5xx responses)
3. For failed requests, calls `get_network_request` for details

If Chrome DevTools MCP is not available, the agent skips to Step 3.

**Step 3: Check the UI**

The agent uses ViewGraph (always available):

1. Calls `get_page_summary` on the latest capture
2. Calls `get_unresolved` for your annotations
3. Runs `audit_accessibility` and `audit_layout`
4. For each issue, calls `find_source` to locate the code
5. Fixes and resolves each annotation

**Step 4: Correlate across layers**

If multiple tools found issues, the agent connects them:

- Server 500 error + broken UI element = backend bug (fix the server code)
- Console TypeError + missing DOM element = JavaScript bug (fix the component)
- Layout overflow + no errors = CSS bug (fix the styles)
- Your annotation + no automated findings = UX issue (fix per your feedback)

**Step 5: Verify the fix**

The agent uses the best verification tool available:

1. TracePulse: `watch_for_errors(15)` - confirms no new server errors after the fix
2. Chrome DevTools MCP: `list_console_messages` - confirms no new JavaScript errors
3. ViewGraph: `request_capture` then `compare_captures` - confirms the UI looks right

The agent reports what it found at each layer:

| Layer | Issue | Fix Applied | Verified With |
|---|---|---|---|
| Backend | 500 on /api/users (missing column) | Added migration | TracePulse - no errors |
| Browser | TypeError in UserList.tsx | Fixed null check | Chrome DevTools - clean console |
| UI | User list empty | Renders after fix | ViewGraph - capture shows data |

### What if you only have ViewGraph?

The skill works fine with ViewGraph alone. It skips the backend and browser steps and focuses on DOM structure, accessibility, layout, and your annotations. You still get a thorough UI debug - you just don't get the cross-stack correlation.

| Tools Available | What You Get |
|---|---|
| ViewGraph only | DOM, accessibility, layout, annotations |
| ViewGraph + Chrome DevTools MCP | Full frontend debugging (console + network + DOM) |
| ViewGraph + TracePulse | Backend-aware UI debugging |
| All three | Complete full-stack debugging |
