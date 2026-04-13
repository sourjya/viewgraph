# What is ViewGraph?

<figure><img src=".gitbook/assets/viewgraph-logo.png" alt="ViewGraph" width="420"></figure>

ViewGraph is the UI context layer for AI coding agents. A browser extension captures structured DOM snapshots from any web page - elements, styles, selectors, accessibility state, network errors - and a local MCP server exposes them to your AI assistant through the [Model Context Protocol](https://modelcontextprotocol.io/). The agent sees what you see in the browser, and can fix what you point at.

{% embed url="https://www.youtube.com/watch?v=ociXQLaY2z4" %}
See a UI bug, fix it in seconds with AI
{% endembed %}

## The Problem

AI coding agents can read your source code. They cannot see your rendered UI. This gap means:

- The agent **guesses** CSS fixes instead of seeing the actual layout
- Bug reports land as **vague screenshots** instead of structured evidence
- Accessibility audits produce violations but **no path to the source file**
- Visual regressions **slip through** because tests check behavior, not structure
- QA handoffs require **back-and-forth** to clarify what's actually broken

These problems cost teams hours per bug across development, testing, QA, and release. ViewGraph solves [27 of them](why-viewgraph.md).

## How ViewGraph Solves This

You click the broken element. You describe what's wrong. You send it to your agent.

The agent receives the element's exact CSS selector, computed styles, accessibility state, bounding box, parent layout, network errors, console warnings - and your comment explaining what to fix. It finds the source file and implements the fix.

No screenshots with arrows. No copy-pasting selectors from DevTools. No "the button is somewhere on the settings page."

For the full list of 27 problems ViewGraph solves across development, testing, QA, and release workflows, see [Why ViewGraph?](why-viewgraph.md).

![ViewGraph sidebar with annotations](.gitbook/assets/sidebar-annotations.png)

## How It Works

```
Your app (any language) --> serves HTML --> Browser renders it --> Extension captures DOM
                                                                        |
                                                                        v
Kiro / Claude / Cursor  <-- MCP protocol <-- ViewGraph server <-- .viewgraph.json files
```

The extension captures the DOM from Chrome or Firefox. The server reads those capture files and exposes them to your AI agent via MCP. Your agent uses this context to modify your source code - it never injects into or manipulates the running application directly.

ViewGraph works with any web app regardless of backend technology. Python, Ruby, Java, Go, PHP - doesn't matter. If it renders HTML in a browser, ViewGraph can capture it.

## Who It's For

### Developers with AI agents

See a bug, click it, describe it, send to agent, agent fixes it. The core loop takes 30 seconds from spotting a bug to the agent having full context.

Works with **Kiro**, **Claude Code**, **Cursor**, **Windsurf**, **Cline**, **Aider**, and any MCP-compatible agent.

See [Why ViewGraph?](why-viewgraph.md) for the full list of development, testing, and release problems it solves.

### Testers and QA reviewers

Same annotation workflow, no AI agent needed. Click elements, add comments, export as:
- **Markdown** - paste into Jira, Linear, or GitHub Issues
- **ZIP report** - markdown + cropped screenshots + network.json + console.json

### Test automation teams

Capture DOM snapshots during Playwright E2E tests. Generate tests from browser captures. The `@viewgraph/playwright` package bridges testing and review.

## What It Captures

Every capture includes:

| Data | What agents do with it |
|---|---|
| Every visible element with CSS selectors | `find_source` locates the source file |
| Computed styles (colors, fonts, spacing, layout) | Agents fix CSS issues precisely |
| Bounding boxes (position, size) | `audit_layout` detects overlaps and overflows |
| Accessibility attributes (role, aria-label) | `audit_accessibility` finds WCAG violations |
| data-testid attributes | `find_missing_testids` improves test coverage |
| Network requests (failed, slow) | Agents correlate UI bugs with API failures |
| Console errors and warnings | Agents fix JS errors causing UI issues |
| Component names (React, Vue, Svelte) | Agents jump from DOM element to component file |

## Capture Accuracy

Measured automatically against 48 diverse real-world websites:

| Dimension | Median |
|---|---|
| **Composite** | **92.1%** |
| Selector accuracy | 99.7% |
| Testid recall | 100.0% |
| Interactive recall | 97.9% |
| Bbox accuracy | 100.0% |
| Semantic recall | 88.2% |

Full methodology and per-site breakdowns: [bulk capture experiment](https://github.com/sourjya/viewgraph/tree/main/scripts/experiments/bulk-capture)

## 34 MCP Tools

Your agent discovers these automatically via the MCP protocol:

- **Core:** list captures, get capture, page summary
- **Analysis:** accessibility audit, layout audit, missing testids, interactive elements
- **Annotations:** resolve, track, diff, detect patterns, generate specs
- **Comparison:** structural diff, baseline regression, screenshot pixel diff, cross-page consistency
- **Sessions:** journey recording, flow visualization, capture stats
- **Source:** find source file, component detection
- **Bidirectional:** request capture from agent, verify fixes

## Open Source

ViewGraph is AGPL-3.0 licensed. Full source, issues, and contributions on [GitHub](https://github.com/sourjya/viewgraph).

| Component | Description |
|---|---|
| [server/](https://github.com/sourjya/viewgraph/tree/main/server) | MCP server - 34 tools, WebSocket collab, baselines |
| [extension/](https://github.com/sourjya/viewgraph/tree/main/extension) | Chrome/Firefox extension - capture, annotate, export |
| [packages/playwright/](https://github.com/sourjya/viewgraph/tree/main/packages/playwright) | Playwright fixture for E2E test captures |
| [power/](https://github.com/sourjya/viewgraph/tree/main/power) | Kiro Power assets - hooks, prompts, steering docs |

{% hint style="info" %}
**GitHub:** [github.com/sourjya/viewgraph](https://github.com/sourjya/viewgraph) - star the repo, report issues, contribute

**npm:** [@viewgraph/core](https://www.npmjs.com/package/@viewgraph/core) - `npm install @viewgraph/core`

**Playwright:** [@viewgraph/playwright](https://www.npmjs.com/package/@viewgraph/playwright) - `npm install @viewgraph/playwright`

**Docs:** [chaoslabz.gitbook.io/viewgraph](https://chaoslabz.gitbook.io/viewgraph)
{% endhint %}
