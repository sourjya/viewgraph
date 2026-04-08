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

**Proposal:** Add an `elementIndex` field to interactive elements in our
captures. When an agent identifies an element via `get_interactive_elements`,
it gets both the ViewGraph nid and a sequential action index. If the agent
is also connected to a Playwright/Puppeteer MCP server, it can use the
index directly.

### 2. Element-level screenshot

Both tools support screenshotting a specific element by selector. We could
add this to our extension - when the agent identifies an element via MCP,
it could request a cropped screenshot of just that element's bounding box.

**Proposal:** New MCP tool `request_element_screenshot({ nid })` that
tells the extension to crop the full screenshot to a specific element's
bbox. Useful for visual regression of individual components.

### 3. Console log capture

Both expose `console://logs` as an MCP resource. Runtime errors and
warnings alongside UI state would help agents debug issues.

**Proposal:** Add an optional `console` section to the ViewGraph capture
format. The extension captures `console.error` and `console.warn` messages
during the capture window. Agents can correlate UI state with runtime errors.

```json
{
  "console": [
    { "level": "error", "text": "Failed to fetch /api/jobs", "timestamp": "..." },
    { "level": "warn", "text": "Deprecated prop 'size' on Button", "timestamp": "..." }
  ]
}
```

### 4. Vision model coordinate factors

@agent-infra's `x-vision-factors` header handles coordinate normalization
between vision model output space and actual screen pixels. If we ever
support vision model integration, we need the same mapping.

**Proposal:** Add `coordinateFrame.visionFactors` to metadata for captures
that include screenshots. This enables round-trip between ViewGraph's
document coordinates and a vision model's normalized coordinate space.

```json
{
  "coordinateFrame": {
    "unit": "css-px",
    "origin": "document-top-left",
    "visionFactors": { "widthFactor": 1.0, "heightFactor": 1.0 }
  }
}
```

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
