# BUG-005: Screenshot crops produce garbage images when page is scrolled

- **ID:** BUG-005
- **Severity:** Major
- **Status:** FIXED

## Description

Cropped annotation screenshots in the ZIP report export were capturing wrong regions of the viewport image - producing "between the lines" slices instead of the annotated element.

## Reproduction

1. Open a page in Chrome, scroll down
2. Annotate several elements
3. Click Report (ZIP download)
4. Open screenshots/ in the ZIP - images show wrong areas or thin slices

## Root Cause

`cropRegions()` in `screenshot-crop.js` used `window.scrollX/scrollY` to convert page-relative annotation coords to viewport-relative crop coords. But:

1. Annotation regions store page-relative coords (`getBoundingClientRect() + scrollX/Y`)
2. `captureVisibleTab()` captures the viewport (viewport-relative)
3. `cropRegions()` ran in the content script context, but `window.scrollX/Y` could differ from the scroll position at annotation time
4. The original code subtracted `window.scrollX/Y` inline, which was 0 in some execution contexts

The mismatch meant crop coordinates pointed to wrong areas of the viewport image.

## Fix

- `cropRegions()` now accepts an explicit `scroll` parameter: `{ scrollX, scrollY }`
- Content script passes `window.scrollX/Y` at crop time
- Added `Math.max(0, ...)` clamping for annotations partially above/left of viewport
- Added `Math.min(width, img.width - sx)` to prevent reading past image bounds
- Annotations entirely outside the viewport are skipped (cw/ch <= 0)

## Files Changed

- `extension/lib/screenshot-crop.js` - scroll param, clamping, bounds check
- `extension/entrypoints/content.js` - pass scroll position to cropRegions
- `extension/tests/unit/screenshot-crop.test.js` - 10 new tests including regression

## Regression Tests

10 tests in `screenshot-crop.test.js` covering:
- No scroll, horizontal scroll, vertical scroll
- Negative coord clamping, image bounds clamping
- Zero-size skip, off-screen skip
- Exact regression scenario (scrolled 500px, annotation at y=600)
