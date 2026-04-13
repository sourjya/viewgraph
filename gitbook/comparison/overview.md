# ViewGraph vs Competitors

ViewGraph occupies a unique position: the UI context layer for AI coding agents. It bridges what humans see in the browser and what agents need to fix code.

## Comparison Matrix

| Capability | ViewGraph | Playwright MCP | Chromatic | Replay.io | axe MCP |
|---|---|---|---|---|---|
| Structured DOM capture | Full snapshot with styles, bbox, selectors | Accessibility tree only | Component screenshots | Runtime recording | Violations only |
| Human annotations | Click/drag + comments + severity | No | Component review | No | No |
| MCP tools for agents | 34 tools | Browser automation | Component metadata | Runtime debugging | A11y scanning |
| Accessibility audit | WCAG + contrast + axe-core (100+ rules) | Needs axe-playwright | WCAG violations | No | Industry standard |
| Layout analysis | Overflow, overlap, viewport | No | No | No | No |
| Source file linking | testid/label/selector grep + React fiber | No | No | Source maps | No |
| Structural regression | Baseline comparison | No | Visual diff | No | No |
| Pixel-level comparison | PNG diff with threshold | No | Full pipeline | No | No |
| Multi-step flows | Session recording + journey analysis | Test scripts | No | Session recording | No |
| Design consistency | Cross-page style drift detection | No | Within Storybook | No | No |
| Works with any web app | Any URL, any backend | Any URL | Storybook required | Any URL | Any URL |
| No code required | Browser extension | Test scripts needed | Stories needed | Recording setup | Extension + MCP |
| Standalone (no AI) | Copy MD / ZIP export | No | Visual review | Debugging UI | Extension |
| Measured accuracy | 92.1% composite, 7 dimensions | No | No | No | No |

## The Key Difference

Browser automation tools (Playwright MCP, Browser Use) control headless browsers - they are the **"hands."** ViewGraph is the **"eyes."** An agent could use ViewGraph to understand a page, then use Playwright to act on it.

Visual regression tools (Chromatic, Percy) compare pixels but require Storybook or CI integration. ViewGraph compares DOM structure and works on any URL with zero project setup.

Runtime debuggers (Replay.io) capture execution traces but have no review workflow. ViewGraph captures point-in-time snapshots with human annotations.

## What Only ViewGraph Does

1. **Human annotations + structured DOM + MCP in one workflow.** No other tool lets a human click an element, write "this is wrong," and have an AI agent receive the element's full computed state plus the human's intent.

2. **Works on any web app with zero setup in the target project.** Playwright needs test scripts. Chromatic needs Storybook. Figma needs design files. ViewGraph needs only a browser extension.

3. **Annotation intelligence.** 7 tools for tracking annotation lifecycle: resolve, check status against newer captures, diff across deploys, detect recurring issues, analyze patterns, generate implementation specs. No competitor tracks human feedback through to resolution.

4. **Measured accuracy.** 92.1% composite accuracy across 48 diverse real-world websites. No competitor publishes equivalent metrics.

5. **14 enrichment collectors** in every capture: network requests, console errors, breakpoints, media queries, stacking contexts, focus chain, scroll containers, landmarks, components, axe-core, event listeners, performance, animations, intersection state.

## Token Efficiency

LLM context windows are finite and expensive. ViewGraph's capture format is designed to minimize token consumption while maximizing the information agents can act on.

### The problem with raw DOM

Dumping a full DOM tree into an LLM context is wasteful. A typical page has 500-2000 elements, but only 20-50 are relevant to any given task. Raw HTML includes repeated attribute names, structural characters, and deeply nested elements that consume tokens with zero semantic value. Research shows JSON is 20-50% more token-expensive than necessary for repeated structures.

### How ViewGraph reduces tokens

**Salience filtering** - the biggest win. Every element is scored and classified into high/med/low tiers. Only high-salience elements (interactive, testid-bearing, ARIA-labeled, semantic) get full style data. Medium gets layout and visual only. Low gets no styles. This eliminates 60-80% of style tokens.

**Progressive disclosure** - agents don't receive the full capture upfront. The MCP tools serve data on demand:

| Tool | Tokens | What it returns |
|---|---|---|
| `get_page_summary` | ~500 | Page title, viewport, element counts, key elements |
| `get_interactive_elements` | ~2,000 | Only buttons, links, inputs with selectors |
| `get_elements_by_role` | ~1,000 | Filtered by role (e.g., just headings) |
| `get_capture` | ~20,000+ | Full capture (only when needed) |

An agent solving a button bug calls `get_interactive_elements` (2K tokens) instead of `get_capture` (20K+ tokens). 90% token savings for the same result.

**Text truncation** - `visibleText` is capped at 200 characters per element. Parent elements that would include all descendant text via `innerText` are truncated, preventing a single `<body>` element from consuming thousands of tokens.

**Field filtering** - captures include only non-default CSS values. A `display: block` on a `<div>` is omitted (it's the default). Research shows field filtering alone saves 30-60% of tokens.

### Compared to alternatives

| Approach | Typical tokens for a 500-element page | Actionable? |
|---|---|---|
| Raw HTML dump | 50,000-100,000 | Low - agent drowns in noise |
| Accessibility tree | 5,000-15,000 | Medium - no styles, no layout |
| Screenshot (base64) | 100,000+ | Low - no selectors, no structure |
| ViewGraph summary | 500 | High - key elements, counts, orientation |
| ViewGraph interactive | 2,000 | High - every actionable element with locators |
| ViewGraph full capture | 20,000-40,000 | High - complete structure with salience filtering |

ViewGraph gives agents the most actionable context per token. The salience model ensures that the 20% of elements that matter get 80% of the detail budget.

For the full format research including benchmarks and design rationale, see the [format research doc](https://github.com/sourjya/viewgraph/blob/main/docs/architecture/viewgraph-format-research.md).
