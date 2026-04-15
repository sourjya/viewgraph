# Detect Regressions

Catch structural UI regressions before they reach production.

<!-- TODO: Embed video V6 when recorded -->

## Prerequisites

- ViewGraph extension installed and connected
- MCP server running
- A page in a known-good state

## Step 1: Capture the good state

When the page looks correct, capture it and set it as the baseline:

```
Capture this page and set it as the baseline
```

The agent calls `request_capture`, then `set_baseline`. This snapshot becomes the reference point.

## Step 2: Make changes

Edit your code, deploy to staging, or merge a PR. The page may have changed.

## Step 3: Compare against baseline

Capture the page again and compare:

```
Compare the latest capture against the baseline
```

Or use the shortcut: `@vg-diff`

The agent calls `compare_baseline` and reports:
- **Elements removed** - "Submit button (data-testid: submit-btn) is missing"
- **Elements added** - "New div.banner appeared at top of page"
- **Layout shifts** - "Navigation moved 24px down"
- **TestID changes** - "login-btn renamed to sign-in-btn"

## Step 4: Fix or accept

If the changes are intentional, update the baseline:

```
Set the latest capture as the new baseline
```

If they're regressions, fix the code and re-capture to verify.

## Auto-capture for continuous monitoring

Enable auto-capture to detect changes as you develop:

1. Open the Inspect tab in the sidebar
2. Toggle **Auto-capture** on
3. Every time you save a file and HMR reloads, a new capture is created
4. The agent can diff consecutive captures to see what changed

## Multi-step regression detection

For user journeys (login -> dashboard -> settings), capture each step:

```
Record a session: capture login, dashboard, and settings pages
```

The agent calls `analyze_journey` to check for:
- Accessibility regressions between steps
- Missing elements that were present in earlier steps
- Layout inconsistencies across the flow

## What gets compared

| Dimension | What it catches |
|---|---|
| Element presence | Buttons, links, inputs that disappeared |
| TestID stability | Renamed or removed data-testid attributes |
| Layout position | Elements that shifted position |
| Element count | Pages that gained or lost significant elements |
| Structural changes | DOM tree differences |
