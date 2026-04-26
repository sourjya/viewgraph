# BUG-030: Annotation markers don't scroll with page

- **ID**: BUG-030
- **Severity**: Medium
- **Status**: FIXED
- **Reported**: 2026-04-26
- **Fixed**: 2026-04-26

## Description

After annotating an element, scrolling the page leaves the marker floating at its original viewport position while the page content moves underneath. The marker and the annotated element become visually disconnected.

## Root Cause

Markers use `position: absolute` on `document.documentElement` with coordinates that include `window.scrollX/Y` at capture time. On pages where the scroll container is `body` or a nested element (common with `html { overflow: hidden; height: 100% }`), the `documentElement` doesn't scroll, so absolute-positioned children stay fixed relative to the viewport.

## Fix

Add a scroll listener that repositions all visible markers by recalculating their element's bounding rect. Uses `requestAnimationFrame` for performance and only updates markers whose annotations have a selector (to find the current element position).
