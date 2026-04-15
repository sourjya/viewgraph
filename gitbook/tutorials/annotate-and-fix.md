# Annotate and Fix Bugs

The core ViewGraph workflow: see a bug, click it, describe it, agent fixes it. Three bugs annotated and fixed without ever opening DevTools - the agent does the rest.

**Watch the walkthrough** - three visual bugs on a login page, annotated and fixed by Kiro:

{% embed url="https://www.youtube.com/watch?t=2s&v=ociXQLaY2z4" %}

## Prerequisites

* ViewGraph extension installed and connected (green dot in sidebar)
* MCP server running (`npx viewgraph-init` from your project)
* An AI agent (Kiro, Claude Code, Cursor, etc.)

## Step 1: Open your app and activate ViewGraph

Navigate to the page with the bug in Chrome. Click the **ViewGraph** icon in the toolbar. The sidebar opens and elements highlight as you hover.

## Step 2: Click the broken element

Click the element that has the problem. The annotation panel appears near the element with:

* A comment text area
* Severity selector (Critical / Major / Minor)
* Category selector (Visual / Functional / Content / A11y / Perf)

Type a description of what's wrong. Be specific: "heading is 56px, should be 24px" is better than "heading is too big."

## Step 3: Annotate more issues

Click additional elements to annotate more bugs. Each gets a numbered badge in the sidebar. Use **Shift+drag** to select a region instead of a single element. Use **Page** mode to add a general note about the page.

## Step 4: Send to your agent

Click **Send to Agent** in the sidebar footer. The button turns green with "Sent!" The agent now has:

* Your annotations with comments and severity
* The full DOM capture (every element's selector, styles, bbox, a11y state)
* Network requests, console errors, viewport breakpoint
* Component names (React/Vue/Svelte)

## Step 5: Ask the agent to fix

Tell your agent:

```
Fix the annotations from the latest ViewGraph capture
```

Or use the shortcut: `@vg-review`

The agent reads each annotation, calls `find_source` to locate the file, implements the fix, and calls `resolve_annotation` to mark it done. Green checkmarks appear in the sidebar.

## Step 6: Verify

Reload the page. The bugs should be fixed. For extra confidence, capture again and compare:

```
Compare the latest capture against the previous one
```

## Tips

* **Scroll wheel** while hovering navigates up/down the DOM tree - useful for selecting a parent container
* Set severity to help the agent prioritize: Critical gets fixed first
* The Inspect tab shows network failures and console errors that might explain the bug
* You can annotate across multiple pages before sending - all annotations bundle together
