# BUG-023: Resolved annotation blocks new note on same element

- **ID**: BUG-023
- **Severity**: Medium
- **Status**: OPEN
- **Reported**: 2026-04-25
- **Fixed**: -

## Description

After resolving an annotation via `@vg-review`, clicking the same element to leave a follow-up note reopens the old resolved annotation's comment panel instead of creating a new annotation. The user cannot add a new note - they can only overwrite the resolved one.

## Reproduction Steps

1. Annotate an element (e.g., a button) with a comment
2. Send to agent, agent fixes and resolves via `resolve_annotation`
3. Sync pulls the resolution - annotation moves to Resolved tab
4. Click the same element again to leave a follow-up note
5. **Expected**: New blank annotation created for the element
6. **Actual**: Old resolved annotation's comment panel opens with previous content

## Root Cause

The dedup logic in `annotate.js` line ~291 matches any existing annotation for the same element by selector + region, including resolved ones. It does not filter out `ann.resolved === true`, so it reopens the resolved annotation instead of creating a new one.

```js
// annotate.js ~291 - no resolved filter
const existing = annotations.find((a) =>
  (a.element && a.element.selector === fullSelector
    && a.region.x === region.x && a.region.y === region.y ...)
  || (a.ancestor === ancestor
    && a.region.x === region.x && a.region.y === region.y ...));
```

## Proposed Fix

Two changes:

1. **Dedup filter**: Skip resolved annotations in the dedup check so clicking a resolved element creates a new annotation:
   ```js
   const existing = annotations.find((a) =>
     !a.resolved && (/* existing match logic */));
   ```

2. **Resolved marker interaction**: Resolved markers are already hidden by default (only shown on Resolved/All tab). The dedup fix alone should be sufficient - when the marker is hidden, the user clicks the raw element and gets a new annotation. No popup from resolved items unless the user is on the Resolved tab.

## UX Consideration

The user's suggestion - "nothing about resolved items should popup until we deliberately view the resolved tab" - aligns with the current marker visibility logic. Resolved markers are already hidden on the Open tab. The only gap is the dedup logic treating resolved annotations as still-active.

## Files to Change

- `extension/lib/annotate.js` - add `!a.resolved` to dedup filter (~line 295)

## Regression Tests

- Click element with resolved annotation on Open tab -> new annotation created
- Click element with resolved annotation on Resolved tab -> behavior TBD (could reopen or create new)
- Click element with no prior annotation -> new annotation created (unchanged)
