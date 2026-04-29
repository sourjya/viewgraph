# Maintainability Audit - April 17, 2026

## Audit Scope
Full codebase review at v0.3.7 (1453 tests, 37 MCP tools, 59 source files).

## Top Risks

### 1. annotation-sidebar.js (842 lines)
Still the largest file. `create()` is ~600 lines containing trust gate UI, send logic, mode buttons, help card wiring, event setup. Should extract: trust gate module, send logic, mode bar.

### 2. constants.js (348 lines)
Does too much: server discovery, port scanning, URL normalization, config fetching, transport init, trust classification. Should split into: `discovery.js`, `url-utils.js`.

### 3. ws-client.js (140 lines) - DEAD CODE
No longer imported anywhere. Transport.js replaced all WS functionality. Safe to delete.

### 4. Inconsistent fetch patterns
`constants.js` still has direct `fetch()` for `fetchConfig`/`updateConfig` while all other modules use transport.js.

### 5. entrypoints/options/options.js
Has its own `discoverServers()` with hardcoded port 9876, duplicating constants.js logic.

## Duplication Patterns

### Test mocks (200+ lines duplicated)
Chrome storage mock repeated in 8+ test files. Fetch mock for /health, /info, /captures repeated in 15+ files.

### UI row pattern
`display:flex, gap:6px` label+value rows created identically in settings.js, inspect.js, captures.js.

### ATTR selector pattern
`querySelector(\`[\${ATTR}="..."])\`` appears 100+ times. Could be a helper.

## Quick Wins (executed)
1. Delete ws-client.js
2. Move fetchConfig/updateConfig to use transport
3. Extract mockServer() test helper
4. Extract createRow() UI helper

## Decomposition Plan (next)
See separate section below.

## Decomposition Roadmap

### Phase 1: annotation-sidebar.js (842 -> ~400 lines)
- Extract `sidebar/trust-gate.js` - showTrustGate, doSend, trust check logic (~80 lines)
- Extract `sidebar/mode-bar.js` - mode buttons, MODE_ICONS, MODE_HINTS, updateModeButtons (~60 lines)
- Extract `sidebar/header.js` - header creation, status dot, shield, bell, help btn, collapse/close (~100 lines)
- Extract `sidebar/footer.js` - send/copy/download buttons with flash states (~80 lines)

### Phase 2: constants.js (348 -> ~150 lines)
- Extract `lib/discovery.js` - scanServers, refreshRegistry, discoverServer, getAllServers
- Extract `lib/url-utils.js` - normalizeUrl, extractPort, extractFilePath, isLocalUrl
- Keep constants.js for: DEFAULT_HTTP_PORT, SERVER_HOST, PORT_SCAN_RANGE, getAgentName, classifyTrust

### Phase 3: Test infrastructure
- Create `tests/mocks/chrome.js` - standard chrome.runtime + chrome.storage mock
- Create `tests/mocks/server.js` - mockServer() with configurable /health, /info, /captures responses
- Create `tests/mocks/transport.js` - pre-initialized transport mock
- Migrate all test files to use shared mocks

### Phase 4: UI helpers
- Create `sidebar/ui-helpers.js` - createRow(label, value), vgQuery(root, name), createDivider()
- Migrate settings.js, inspect.js, captures.js to use helpers
