# Competitive Analysis: Browser Automation MCP Servers

**Date:** 2026-04-08

**Packages analyzed:**
- [@agent-infra/mcp-server-browser](https://www.npmjs.com/package/@agent-infra/mcp-server-browser) (ByteDance/UI-TARS)
- [MCP-Server-Playwright](https://github.com/VikashLoomba/MCP-Server-Playwright) (Automata Labs)

---

## How they differ from ViewGraph

Both are browser automation MCP servers - they control a headless browser
(Puppeteer/Playwright) to navigate, click, fill forms, and take screenshots.

| | Browser MCP / Playwright MCP | ViewGraph |
|---|---|---|
| Model | Headless browser controlled by agent | Real browser used by human, captured for agent |
| Purpose | Agent acts on pages | Agent understands pages |
| Input | Agent sends commands | Human captures state |
| Output | Action results, screenshots | Structured page context |
| Dependency | Puppeteer/Playwright runtime | Browser extension (lightweight) |

They are complementary, not competitive. An agent could use ViewGraph to
understand a page, then use Playwright MCP to act on it.

---

## Features worth incorporating

### 1. Element index for action interop

@agent-infra uses a "label index" system - each interactive element gets a
numeric index. The agent says "click element 7" instead of passing a selector.
This is cleaner for action workflows and bridges ViewGraph captures to
browser automation tools.

**Status: Shipped.** ViewGraph's `nid` (node ID) system serves this purpose.
Each element gets a stable numeric ID in the capture. The `get_interactive_elements`
tool returns elements with nids that agents can reference.

### 2. Element-level screenshot

Both tools support screenshotting a specific element by selector. We could
add this to our extension - when the agent identifies an element via MCP,
it could request a cropped screenshot of just that element's bounding box.

**Status: Shipped.** The `compare_screenshots` tool does pixel-level comparison.
The extension crops screenshots per annotation region via `screenshot-crop.js`.

### 3. Console log capture

Both expose `console://logs` as an MCP resource. Runtime errors and
warnings alongside UI state would help agents debug issues.

**Status: Shipped.** The `console` enrichment collector captures `console.error`
and `console.warn` messages. Included in every capture automatically.

### 4. Vision model coordinate factors

@agent-infra's `x-vision-factors` header handles coordinate normalization
between vision model output space and actual screen pixels. If we ever
support vision model integration, we need the same mapping.

**Status: Shipped.** The `coordinateFrame` metadata section includes unit,
origin, scroll offset, and precision fields. Device pixel ratio is also
recorded for retina display mapping.

---

## What NOT to incorporate

- **Browser automation tools** (navigate, click, fill, scroll) - that's
  their domain. ViewGraph is about understanding, not controlling.
- **Headless browser dependency** - they require Puppeteer/Playwright.
  We use the user's real browser via extension. Much lighter.
- **Vision model as primary mode** - their vision mode is a fallback for
  when structured data fails. Our structured data IS the product.

---

## Interop opportunity

The strongest play is making ViewGraph captures consumable by browser
automation tools. If an agent has both ViewGraph and Playwright MCP
servers connected:

1. ViewGraph: understand the page (structure, a11y, selectors, layout)
2. Playwright: act on the page (click, fill, navigate)

The element index and locator data from ViewGraph feeds directly into
Playwright's action commands. This makes ViewGraph the "eyes" and
Playwright the "hands."
