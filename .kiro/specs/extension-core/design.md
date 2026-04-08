# Extension Core - Design

## Architecture

```
Popup (popup.js)
  │ click "Capture Page"
  │
  ▼ chrome.runtime.sendMessage
Background (background.js)
  │ 1. inject content script
  │ 2. send "capture" message
  │
  ▼ chrome.tabs.sendMessage
Content Script (content.js)
  │ 1. traverse DOM
  │ 2. score salience
  │ 3. serialize to ViewGraph JSON
  │
  ▼ return capture data
Background
  │ 1. take screenshot
  │ 2. POST to localhost:9876/captures
  │ 3. notify popup of result
  │
  ▼ chrome.runtime.sendMessage
Popup
  │ show success/error
```

## File Structure

```
extension/
├── entrypoints/
│   ├── background.js        Capture orchestration
│   ├── content.js           DOM traversal (injected on demand)
│   └── popup/
│       ├── index.html
│       └── popup.js
└── lib/
    ├── traverser.js         DOM tree walker
    ├── salience.js          Salience scoring
    └── serializer.js        ViewGraph v2.1 JSON builder
```

## Content Script Injection

The content script is NOT declared in manifest `content_scripts` (which
would inject on every page). Instead, it's injected on demand via
`chrome.scripting.executeScript` when the user clicks Capture. This
requires the `activeTab` permission (already declared).

## DOM Traversal Strategy

Walk `document.body` depth-first. For each element:

1. Skip if invisible (display:none, visibility:hidden, zero bbox)
2. Assign nid (incrementing integer)
3. Extract: tag, id, classes, data-testid, aria-*, textContent, role
4. Get bounding box via `getBoundingClientRect()` + scroll offset (document coords)
5. Get computed styles for visible elements
6. Build parent-child nid references
7. Generate alias from testid > id > role+name > tag+nid

## Salience Scoring

Simple weighted score, no ML:

| Factor | Weight | High threshold |
|---|---|---|
| Interactive (button, a, input, select, textarea) | +30 | |
| Has data-testid | +20 | |
| Has aria-label or role | +15 | |
| In viewport | +10 | |
| Has visible text | +10 | |
| Large bbox (>100x50) | +5 | |
| Semantic tag (nav, main, header, footer, form, table) | +10 | |

- Score >= 50: high
- Score >= 20: med
- Score < 20: low

## Serialization

Build the ViewGraph v2.1 JSON object in memory, then return it to the
background script. The background script handles I/O (HTTP push).

Sections built:
1. `metadata` - from window/document properties
2. `nodes` - from traversal results, grouped by tier then tag
3. `details` - from traversal results, tiered style disclosure
4. `relations` - from aria-labelledby, aria-controls, for attributes
5. `summary` - computed from nodes (counts, style palette, element list)

## HTTP Push

Background script POSTs to `http://127.0.0.1:9876/captures`. If the
server is not running, the capture still succeeds - it's just not
pushed. The extension should not depend on the server being available.
