# What is ViewGraph?

<figure><img src=".gitbook/assets/viewgraph-logo.png" alt="ViewGraph" width="420"></figure>

ViewGraph is the UI context layer for AI coding agents. A browser extension captures structured DOM snapshots from any web page - elements, styles, selectors, accessibility state, network errors - and a local MCP server exposes them to your AI assistant through the [Model Context Protocol](https://modelcontextprotocol.io/). The agent sees what you see in the browser, and can fix what you point at.

## The Problem

AI coding agents can read your source code. They cannot see your rendered UI. This gap creates real pain:

**"The agent can't see what I see."** You say "the button is behind the modal." The agent guesses which CSS properties are wrong. It changes `z-index`, breaks something else, you correct it, it tries again. Three round-trips for a one-line fix.

**"I can't explain the bug precisely enough."** You write "the layout is broken on mobile." The agent doesn't know which element, what breakpoint, what the current styles are, or what they should be. It makes assumptions. Most are wrong.

**"Accessibility audits are disconnected from fixes."** You run axe or Lighthouse, get a list of violations, manually find each element in code, fix it, re-run. The audit tool and the code editor are separate worlds. Each fix takes 30 minutes.

**"I don't know which file renders this element."** In a large React/Vue/Svelte app, finding which component renders a specific DOM element requires mental mapping or React DevTools. Your AI agent has no way to do this at all.

**"QA handoffs are vague."** Testers write "the button color is wrong" in Jira with a full-page screenshot. You have to figure out which button, what the current color is, what it should be, and what CSS to change.

**"Visual regressions slip through."** A CSS change on one page breaks layout on another. No one notices until production. Your tests check behavior but not structure.

**"I can't debug z-index, focus, or scroll issues from code."** "Dropdown behind modal" bugs, "can't tab to submit" bugs, and "wrong thing scrolls" bugs are caused by browser-computed state that's invisible in source code.

## How ViewGraph Solves This

You click the broken element. You describe what's wrong. You send it to your agent.

The agent receives the element's exact CSS selector, computed styles, accessibility state, bounding box, parent layout, network errors, console warnings - and your comment explaining what to fix. It finds the source file and implements the fix.

No screenshots with arrows. No copy-pasting selectors from DevTools. No "the button is somewhere on the settings page."

| Pain point | Without ViewGraph | With ViewGraph |
|---|---|---|
| Agent can't see UI | 3-5 round-trips guessing CSS | One annotation, one fix |
| Vague bug descriptions | "Layout broken on mobile" | Element selector + computed styles + breakpoint |
| A11y audit to fix | 30 min per issue (find element, find file, fix, re-run) | 2 min (agent has element + source file + fix context) |
| Finding source file | Mental mapping or React DevTools | `find_source` with testid/selector/React fiber |
| QA handoff | Screenshot with arrow | Structured report with element details, styles, network state |
| Regression detection | Manual visual comparison | `compare_baseline` catches missing elements, layout shifts |
| Z-index/focus/scroll bugs | Hours of DevTools debugging | Stacking, focus chain, and scroll data in every capture |

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

**npm:** [viewgraph](https://www.npmjs.com/package/viewgraph) - `npm install viewgraph`

**Playwright:** [@viewgraph/playwright](https://www.npmjs.com/package/@viewgraph/playwright) - `npm install @viewgraph/playwright`

**Docs:** [chaoslabz.gitbook.io/viewgraph](https://chaoslabz.gitbook.io/viewgraph)
{% endhint %}
