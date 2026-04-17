# Idea: Themed Tooltip Component

**Created:** 2026-04-18
**Status:** Approved - build as part of M16 Sidebar UX Polish
**Category:** Extension UI Component

## Context

Sidebar buttons and icons lack explainer text. Native `title` attributes can't be styled
and behave inconsistently. Since we're in shadow DOM, a custom tooltip is trivial - no
z-index wars, no style leakage, no library needed.

## Design

Singleton tooltip div inside the shadow root, positioned via `getBoundingClientRect()`.
Event delegation on `data-tooltip` attribute - no per-element setup.

### API

```html
<button data-tooltip="Send annotations to your AI agent">Send to Agent</button>
<button data-tooltip="Capture the current page" data-tooltip-placement="below">📸</button>
```

```js
// sidebar init
createTooltip(shadowRoot);
```

### Behavior

- Show on `mouseenter` + `focusin` (keyboard accessible)
- Hide on `mouseleave` + `focusout`
- 300ms show delay, 0ms hide
- Default placement: above, auto-flip to below if near viewport top
- Max width 200px, text wraps
- `opacity` transition 150ms
- `role="tooltip"`, `aria-describedby` on anchor

### Implementation

Single file: `extension/lib/tooltip.js` (~60 lines)
- `createTooltip(shadowRoot)` - attaches delegation listener, returns `{ destroy }`
- Singleton div, repositioned per hover
- Reads `data-tooltip` and optional `data-tooltip-placement`
- Styled with existing CSS variables from `styles.js`

### What NOT to do

- No `title` attribute (unstyled, inconsistent)
- No library (Tippy.js, Floating UI - overkill for fixed sidebar layout)
- No per-element tooltip instances (wasteful)
- No arrow/caret (complexity for minimal value in sidebar)

## Consumers

- All sidebar action buttons (Send to Agent, Copy Markdown, Download Report)
- Mode bar icons (Annotate, Capture)
- Inspect tab diagnostic icons
- Settings overlay toggles
- Collapsed strip mode icons
- BUG-014 fix: "URL mapping docs" and "All servers" links get tooltips too
