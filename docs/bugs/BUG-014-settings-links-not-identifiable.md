# BUG-014: Settings Page Links Not Visually Identifiable

- **ID**: BUG-014
- **Severity**: Low
- **Status**: FIXED
- **Reported**: 2026-04-17
- **Fixed**: 2026-04-18

## Description

In the extension settings/options page, the "URL mapping docs" and "All servers" links don't appear in standard link colors and lack icons. They are visually indistinguishable from regular text - the only way to discover they're clickable is by hovering and seeing the cursor change.

## Reproduction Steps

1. Open the ViewGraph extension options/settings page
2. Look at "URL mapping docs" and "All servers" text
3. Observe: no underline, no link color, no external-link icon
4. Only on hover does the cursor change to pointer

## Root Cause

Links styled as plain text without `color`, `text-decoration`, or icon indicators.

## Fix Description

- Changed link color from `#666` (invisible gray) to `#818cf8` (indigo, matches theme)
- Replaced color-change hover with underline hover (link stays visible at rest)
- Added book icon (SVG) before "URL mapping docs"
- Added monitor icon (SVG) before "All servers"
- Links use `display: inline-flex` with `align-items: center` for icon alignment

## Files Changed

- `extension/lib/sidebar/settings.js`
- `extension/tests/unit/sidebar/settings.test.js`

## Regression Tests

- `(+) URL mapping docs link has visible link color`
- `(+) All servers link has visible link color`
- `(+) URL mapping docs link has an SVG icon`
- `(+) All servers link has an SVG icon`
