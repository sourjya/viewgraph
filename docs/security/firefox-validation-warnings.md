# Firefox Store Validation Warnings

**Version:** 0.4.5
**Result:** 0 errors, ~25 warnings, 0 notices (reduced from 29)

## Addressed

| Warning | Count | Fix |
|---|---|---|
| storage.session not supported (FF 109) | 2 → 0 | Bumped min version to Firefox 115 (ESR) |
| Manifest key unsupported (data_collection_permissions) | 1 → 0 | Resolved by min version bump |
| Unsafe innerHTML (settings.js helpLink) | 1 → 0 | Converted to svgFromString + createTextNode |

## Remaining (cannot fix)

| Warning | Count | Source | Why it can't be fixed |
|---|---|---|---|
| Function constructor (eval) | 10 | axe-core library (bundled) | axe-core v4.11.2 uses doT.js template engine internally which uses Function constructor. This is the industry-standard accessibility testing library. Replacing it is not feasible. |
| Unsafe innerHTML | 7 | SVG icon strings in sidebar modules | All are hardcoded SVG markup strings (no user input). Converting all to DOMParser is planned (MRR-001 Phase 3). Not exploitable - all strings are compile-time constants. |
| action.setPopup/onClicked/openPopup | 8 | WXT framework polyfill | WXT (Web Extension Tooling) emits chrome.action.* references for cross-browser MV2/MV3 compatibility. Firefox uses browser.* namespace. These are framework internals we don't control. |

## Notes for Reviewer

All 25 remaining warnings are from:
1. **Third-party library internals** (axe-core) - industry-standard a11y testing, uses Function constructor for template compilation
2. **Build framework polyfills** (WXT) - cross-browser compatibility layer
3. **Hardcoded SVG strings** - compile-time constants, no user input flows into innerHTML

No user data, network responses, or dynamic content is ever assigned to innerHTML. The extension runs in a closed shadow DOM which provides additional isolation.
