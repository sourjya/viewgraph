# BUG-014: Settings Page Links Not Visually Identifiable

- **ID**: BUG-014
- **Severity**: Low
- **Status**: OPEN
- **Reported**: 2026-04-17
- **Fixed**: —

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

- Apply standard link color (e.g., `color: var(--link-color)` or `#3b82f6`)
- Add subtle underline or underline-on-hover
- Add external-link icon (↗) for links that open new tabs
- Add internal navigation icon for "All servers" if it navigates within the extension

## Files Changed

—

## Regression Tests

—
