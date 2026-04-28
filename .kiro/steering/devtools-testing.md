---
inclusion: always
description: Chrome DevTools MCP testing rules for extension development QA
---

# DevTools Testing

Rules for using Chrome DevTools MCP alongside ViewGraph MCP during extension development.

## When to use DevTools MCP

Use DevTools MCP tools proactively during extension development:

- **After any code change** to extension files - take a screenshot and check console for errors
- **After fixing a bug** - verify the fix visually and check for regressions
- **When investigating a user-reported issue** - reproduce it by navigating to the same page
- **Before tagging a release** - run through the sidebar, annotation flow, and export on the demo page

## Standard checks after extension changes

1. Navigate to the test page (`docs/demo/index.html` or a localhost app)
2. `list_console_messages` with `types: ["error", "warn"]` - zero tolerance for extension errors
3. `list_network_requests` - verify no failed requests from extension activity
4. `take_screenshot` - visual sanity check

If the sidebar is active (user opened it):
5. `take_snapshot` - read the sidebar DOM, verify structure
6. Click through sidebar tabs and buttons - check for console errors after each
7. `take_screenshot` of the sidebar at each state

## What I can and cannot control

**Can do:**
- Navigate pages, resize viewport, emulate devices/dark mode
- Read page DOM, console, network after extension activates
- Interact with extension UI once it's injected into the page (sidebar, tooltips, overlays)
- Take screenshots and snapshots of any page element
- Run JS in page context to inspect extension-injected state
- Monitor performance traces and memory snapshots

**Cannot do:**
- Click the browser toolbar icon (browser chrome, outside page scope)
- Access the extension popup window
- Read `chrome.storage` directly (use DOM state instead)
- Trigger global extension keyboard shortcuts
- Read the service worker / background script console

**When blocked:** Ask the user to perform the browser-chrome action (click toolbar icon, open popup), then take over inspection from there.

## Verify loop

The standard post-fix workflow:

1. Fix extension code
2. Ask user to reload extension and activate sidebar
3. `take_screenshot` + `list_console_messages` - confirm fix, no new errors
4. If user captures: `get_page_summary` via ViewGraph MCP to verify capture quality
5. `compare_captures` if before/after captures exist

## Tool preferences

- Prefer `take_snapshot` over `take_screenshot` for DOM inspection - it's structured and searchable
- Use `take_screenshot` for visual layout issues, overlaps, styling problems
- Use `evaluate_script` sparingly - only when snapshot/screenshot can't answer the question
- Use `list_console_messages` after every interaction sequence, not just at the end
- Use `list_network_requests` filtered by `resourceTypes: ["websocket", "fetch", "xhr"]` for extension traffic

## Performance testing

When checking extension performance impact:
- `performance_start_trace` on a page WITHOUT extension active (baseline)
- Have user activate extension
- `performance_stop_trace` and check for long tasks > 50ms, layout shifts, excessive paint
- `take_memory_snapshot` before and after sidebar open/close cycle to check for leaks

## Combining with ViewGraph MCP

DevTools MCP shows the live page. ViewGraph MCP shows structured captures. Use both:

- DevTools for real-time interaction and error monitoring
- ViewGraph for structured DOM analysis, a11y audits, annotation review
- Cross-reference: if a ViewGraph capture shows an issue, use DevTools to reproduce and inspect live
- After fixing: use DevTools to verify visually, then ViewGraph capture to verify structurally

## Release Checklist Reminder

On every version bump, BEFORE pushing:
1. Build extension ZIPs: `bash scripts/build-extension.sh`
2. Commit the new ZIPs in `downloads/`
3. Push, tag, create GitHub release with `gh release create`
4. Upload ZIPs to release: `gh release upload vX.X.X downloads/*.zip`

Do NOT push a tag without extension ZIPs attached to the release.
