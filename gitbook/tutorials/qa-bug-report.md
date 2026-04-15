# File a QA Bug Report

Create structured, evidence-rich bug reports without an AI agent.

<!-- TODO: Embed video V5 when recorded -->

## Prerequisites

- ViewGraph extension installed (no MCP server needed for this workflow)

## Step 1: Open the page and activate ViewGraph

Navigate to the page with the issue. Click the **ViewGraph** icon. The sidebar opens.

## Step 2: Annotate the issues

Click each broken element and describe what's wrong:
- Set **severity** (Critical / Major / Minor) to help developers prioritize
- Set **category** (Visual / Functional / Content / A11y / Perf) for routing
- Use **Shift+drag** for region-based issues (e.g., "this whole section is misaligned")

## Step 3: Check the Inspect tab

Switch to the **Inspect** tab to see:
- **Network requests** - any failed API calls that might explain the bug
- **Console errors** - JavaScript errors from the page
- **Viewport breakpoint** - which responsive breakpoint is active

This context gets included in your export automatically.

## Step 4: Export

### Option A: Copy Markdown

Click **Copy MD** in the sidebar footer. Paste into Jira, Linear, GitHub Issues, or Slack.

The markdown includes:
- Page URL, date, viewport, browser
- Active breakpoint
- Failed network requests (if any)
- Console errors (if any)
- Each annotation with element selector, computed styles, and your comment

### Option B: Download ZIP Report

Click **Report** in the sidebar footer. A ZIP downloads containing:
- `report.md` - the full markdown report
- `screenshots/` - cropped screenshots per annotation
- `network.json` - all network request data
- `console.json` - all console errors and warnings

## What makes this better than a screenshot

| Traditional bug report | ViewGraph bug report |
|---|---|
| "The button color is wrong" | Element: `button.btn-primary`, current color: `#475569`, selector: `[data-testid="save-btn"]` |
| Full-page screenshot with arrow | Cropped screenshot of the exact element + computed styles |
| "It's broken on mobile" | Viewport: 375px, breakpoint: `sm`, layout overflow detected |
| No network context | `GET /api/users` returned 404 |

## Tips

- You don't need the MCP server running for Copy MD or ZIP export
- The Inspect tab data refreshes each time you switch to it
- Annotations persist in the sidebar until you clear them or close the tab
- Multiple annotations across the same page bundle into one report
