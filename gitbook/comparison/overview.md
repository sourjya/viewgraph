# ViewGraph vs Competitors

ViewGraph occupies a unique position: the UI context layer for AI coding agents. It bridges what humans see in the browser and what agents need to fix code.

## Comparison Matrix

| Capability | ViewGraph | Cursor Browser | Antigravity Browser | Playwright MCP | Chromatic |
|---|---|---|---|---|---|
| **How it works** | Browser extension + MCP server | Built-in headless browser in IDE | Built-in Chromium in IDE | Headless browser automation | Component screenshot pipeline |
| **Human annotations** | Click/drag + comments + severity + categories | No | No (agent-only screenshots) | No | Component review |
| **Review & collab workflow** | Annotate → Send to Agent / Copy MD / ZIP report | No | Artifact trail (screenshots, logs) | No | Visual review |
| **Non-technical users** | PMs, QA, designers can click and describe | Developers only | Developers only | Developers only | Developers only |
| **Structured DOM capture** | Full snapshot: styles, bbox, selectors, 17 enrichment collectors | Screenshot + accessibility tree | Screenshot + page state | Accessibility tree | Component screenshots |
| **MCP tools** | 37 tools (query, audit, diff, annotate, generate) | Browser tool (screenshot, click, type) | Browser agent (navigate, screenshot) | Browser automation | Component metadata |
| **Accessibility audit** | axe-core 100+ rules + smart suggestions | No | No | Needs axe-playwright | WCAG violations |
| **Source file linking** | testid/label/selector grep + React fiber | No | No | No | No |
| **Transient state capture** | Toast detection, animation jank, flash content (30s buffer) | No | No | No | No |
| **Structural regression** | Baseline comparison + structural diff | No | No | No | Visual diff |
| **Export without AI** | Copy Markdown (Jira/GitHub) + ZIP report | No | No | No | Visual review |
| **Works with any agent** | Any MCP agent (Kiro, Claude, Cursor, Windsurf, Cline) | Cursor only | Antigravity only | Any MCP agent | CI/CD |
| **Works with any web app** | Any URL, any backend, any framework | Any URL | Any URL | Any URL | Storybook required |
| **No code required** | Browser extension - click and annotate | Agent writes code to interact | Agent navigates autonomously | Test scripts needed | Stories needed |
| **Measured accuracy** | 92.1% composite across 48 sites | No | No | No | No |
| **Privacy** | All data stays local, no cloud | IDE-local | Google cloud | Local | Cloud |

## The Key Difference

There are three categories of browser tools for AI agents:

**1. IDE-embedded browsers (Cursor, Antigravity)** - The agent controls a headless browser inside the IDE. It can navigate, click, type, and take screenshots. Great for automated testing and verification. But: no human annotation workflow, no structured DOM data for the agent, no export to Jira/GitHub, and locked to one IDE.

**2. Browser automation (Playwright MCP, Browser Use)** - The agent controls a headless browser via MCP. Similar to IDE browsers but decoupled from the IDE. These are the **"hands"** - they act on pages.

**3. ViewGraph** - A browser extension that captures what the human sees and packages it for the agent. This is the **"eyes + voice"** - humans point at problems, describe them, and the agent receives structured evidence. The agent never controls the browser directly.

**Why this matters:** Cursor and Antigravity's browser tools let agents verify their own work (take a screenshot after making a change). ViewGraph lets humans direct the agent's work (click what's wrong, describe it, agent fixes it). These are complementary, not competing.

## What Only ViewGraph Does

1. **Human-in-the-loop annotation workflow.** No other tool lets a non-technical user click an element, write "this looks wrong," and have an AI agent receive the element's full computed state plus the human's intent. Cursor and Antigravity require the developer to describe issues in text.

2. **Works across all agents and IDEs.** Cursor's browser only works in Cursor. Antigravity's browser only works in Antigravity. ViewGraph works with any MCP-compatible agent in any IDE - including Cursor and Antigravity themselves (via MCP).

3. **Review and collaboration.** Export annotated bug reports as Markdown (paste into Jira/Linear/GitHub) or ZIP (screenshots + network + console). No other browser tool produces structured, shareable bug reports.

4. **Transient state capture.** 30-second mutation buffer catches toasts, flash content, animation jank, and render thrashing - bugs that disappear before you can screenshot them.

5. **17 enrichment collectors** in every capture: network, console, accessibility, stacking, focus, scroll, landmarks, components, animations, storage, CSS variables, transient state, and more. IDE browsers capture screenshots; ViewGraph captures the full diagnostic picture.

## Token Efficiency: The Biggest Win

IDE browser tools (Cursor, Antigravity) give agents **screenshots**. A single screenshot costs 100,000+ tokens as base64 - and the agent still can't extract a CSS selector, computed style, or source file path from pixels.

ViewGraph gives agents **structured data** at a fraction of the cost:

| What the agent receives | Tokens | Can fix CSS? | Can find source? | Can audit a11y? |
|---|---|---|---|---|
| **Screenshot** (Cursor/Antigravity) | 100,000+ | No - guesses from pixels | No | No |
| Raw HTML dump | 50,000-100,000 | Partially - no computed styles | No | No |
| Accessibility tree | 5,000-15,000 | No - no styles, no layout | No | Partially |
| **ViewGraph summary** | **500** | Yes - key styles included | Yes - selectors | Yes - axe-core |
| **ViewGraph interactive** | **2,000** | Yes - full computed styles | Yes - testids + selectors | Yes |
| **ViewGraph full capture** | **20,000-40,000** | Yes - salience-filtered | Yes - React fiber paths | Yes - 100+ rules |

**That's 50-200x fewer tokens for more actionable data.** A screenshot tells the agent "there's a big heading." ViewGraph tells it "h1 at `index.html:38` has `font-size: 56px`, selector `h1.hero-title`, missing `aria-label`."

Key techniques:
- **Salience filtering** - only high-importance elements get full style data (60-80% token reduction)
- **Progressive disclosure** - agents call `get_page_summary` (500 tokens) first, drill down only when needed
- **Field filtering** - default CSS values omitted (`display: block` on a `<div>` is not stored)

For the full format spec and benchmarks, see [The Capture Format](capture-format.md).
