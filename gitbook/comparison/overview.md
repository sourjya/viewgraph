# ViewGraph vs Competitors

ViewGraph occupies a unique position: the UI context layer for AI coding agents. It bridges what humans see in the browser and what agents need to fix code.

![ViewGraph annotation workflow](../.gitbook/assets/sidebar-annotations.png)

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
