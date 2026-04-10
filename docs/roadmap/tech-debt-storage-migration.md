# Tech Debt: Migrate existing callers to storage.js wrapper

## Context

`extension/lib/storage.js` was created as a unified storage interface with a key registry (`KEYS`), `get/set/remove` for local storage, and `getSync/setSync` for sync storage. Currently only the request caching in `annotation-sidebar.js` uses it.

## Remaining Callers

Five files still use raw `chrome.storage.local.get/set` with magic string keys:

| File | Keys used | Priority |
|---|---|---|
| `entrypoints/background.js` | `vg-auto-mapping`, `vg-override-enabled`, `vg-blocked-reason` | Medium |
| `entrypoints/options/options.js` | `vg-auto-mapping`, `vg-override-enabled`, `vg-project-mappings` (sync) | Medium |
| `entrypoints/popup/popup.js` | `vg-blocked-reason`, `vg-settings` | Low |
| `lib/annotate.js` | `vg-annotations-{url}` (dynamic) | Low |
| `lib/annotation-sidebar.js` | `vg-settings` (2 remaining raw calls) | Low |

## Migration Steps

1. Import `{ KEYS, get, set, getSync, setSync, annotationKey }` from `./storage.js`
2. Replace each `chrome.storage.local.get(KEY)` with `get(KEYS.xxx)`
3. Replace each `chrome.storage.local.set({ KEY: val })` with `set(KEYS.xxx, val)`
4. Replace sync calls with `getSync/setSync`
5. Remove magic string constants from each file
6. Run full test suite after each file migration

## Risk

Low. Pure refactor, no behavior change. Each file can be migrated independently.
