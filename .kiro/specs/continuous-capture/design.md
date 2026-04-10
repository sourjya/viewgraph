# M14.1 Continuous Capture - Design

## Overview

Auto-capture DOM snapshots when the page changes during development.
Detects two types of changes:

1. **Hot-reload** - Vite/webpack HMR replaces modules, page updates without
   full navigation. Detected via `beforeunload` + `load` events, or HMR-
   specific signals (`vite:afterUpdate`, webpack hot events).
2. **DOM mutations** - React re-renders, dynamic content loading, user
   interactions that change the DOM. Detected via `MutationObserver`.

Each auto-capture is pushed to the server and appears in the Inspect tab's
captures list. If a baseline exists, the diff is computed automatically.

## Architecture

```
MutationObserver ---> debounce (2s) ---> capture + push
HMR event ---------> debounce (1s) ---> capture + push
Toggle in Inspect tab controls on/off
State persisted to chrome.storage per tab
```

## MutationObserver Watcher

Watches `document.body` for:
- `childList` changes (elements added/removed)
- `attributes` changes on `data-testid`, `aria-*`, `role`, `class`
- `subtree: true` for deep observation

Ignores:
- ViewGraph's own UI elements (`[data-vg-annotate]`)
- Style-only attribute changes (handled by HMR path)
- Mutations during an active capture (prevent recursion)

Debounce: 2 seconds after last mutation. This handles React batch renders
where multiple mutations fire in rapid succession.

## Hot-Reload Detection

Three detection strategies, tried in order:

1. **Vite HMR** - listen for `vite:afterUpdate` custom event on `document`
2. **Webpack HMR** - check `module.hot` and listen for accept callbacks
3. **Full reload fallback** - `beforeunload` + `load` event pair

Debounce: 1 second after HMR event (shorter than mutation - HMR is a
discrete event, not a stream).

## Toggle UI

In the Inspect tab, below the viewport indicator:

```
AUTO-CAPTURE  [====]
```

Toggle switch. When on:
- Green pulsing dot appears in sidebar header
- MutationObserver and HMR listeners are active
- Each auto-capture shows a toast notification

When off:
- Observers disconnected
- No performance overhead

State persisted to `chrome.storage.local` keyed by tab ID.

## Capture Flow

1. Debounce timer fires
2. Check if a capture is already in progress (skip if so)
3. Run the standard DOM traversal + serialization
4. Push to server via background script
5. If baseline exists, server auto-computes diff
6. Inspect tab refreshes captures list on next view

## Constraints

- Max 1 auto-capture per 5 seconds (hard rate limit)
- Auto-capture disabled on pages > 2000 elements (performance)
- Observer disconnects if tab is backgrounded (visibility API)
- No auto-capture during active annotation (user is working)
